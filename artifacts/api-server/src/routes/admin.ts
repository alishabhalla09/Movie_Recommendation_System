import { Router, type IRouter } from "express";
import { db, usersTable, itemsTable, interactionsTable, watchlistTable, reviewsTable, Item } from "@workspace/db";
import { desc, sql, eq } from "drizzle-orm";
import {
  GetAnalyticsResponse,
  GetAdminStatsResponse,
  ImportTmdbMoviesBody,
  ImportTmdbMoviesResponse,
  RefreshTmdbMovieParams,
  RefreshTmdbMovieResponse,
  TriggerRecommenderTrainingResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import {
  importMoviesFromTmdb,
  fetchMovieDetails,
  normalizeTmdbMovie,
  getTmdbApiKey,
} from "../lib/tmdb";
import { buildItemVector } from "../lib/recommendations";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [[users], [items], [interactions], [watchlist], [reviews]] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(usersTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(itemsTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(interactionsTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(watchlistTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(reviewsTable),
  ]);

  res.json(
    GetAdminStatsResponse.parse({
      totalUsers: Number(users?.count ?? 0),
      totalItems: Number(items?.count ?? 0),
      totalInteractions: Number(interactions?.count ?? 0),
      totalWatchlistEntries: Number(watchlist?.count ?? 0),
      totalReviews: Number(reviews?.count ?? 0),
    })
  );
});

router.get("/admin/analytics", requireAdmin, async (_req, res): Promise<void> => {
  const [[users], [items], [interactions]] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(usersTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(itemsTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(interactionsTable),
  ]);

  // Top items by interaction count
  const topItemsRows = await db
    .select({
      id: itemsTable.id,
      tmdbId: itemsTable.tmdbId,
      title: itemsTable.title,
      tagline: itemsTable.tagline,
      description: itemsTable.description,
      genres: itemsTable.genres,
      tags: itemsTable.tags,
      rating: itemsTable.rating,
      voteCount: itemsTable.voteCount,
      popularity: itemsTable.popularity,
      releaseYear: itemsTable.releaseYear,
      releaseDate: itemsTable.releaseDate,
      posterUrl: itemsTable.posterUrl,
      backdropUrl: itemsTable.backdropUrl,
      logoUrl: itemsTable.logoUrl,
      trailerUrl: itemsTable.trailerUrl,
      trailerKey: itemsTable.trailerKey,
      trailerSite: itemsTable.trailerSite,
      trailerName: itemsTable.trailerName,
      duration: itemsTable.duration,
      director: itemsTable.director,
      cast: itemsTable.cast,
      originalLanguage: itemsTable.originalLanguage,
      country: itemsTable.country,
      type: itemsTable.type,
      createdAt: itemsTable.createdAt,
      interactionCount: sql<number>`COUNT(${interactionsTable.id})`.as("interaction_count"),
    })
    .from(itemsTable)
    .leftJoin(interactionsTable, sql`${interactionsTable.itemId} = ${itemsTable.id}`)
    .groupBy(itemsTable.id)
    .orderBy(desc(sql`interaction_count`))
    .limit(10);

  // Genre distribution
  const allItems = await db.select({ genres: itemsTable.genres }).from(itemsTable);
  const genreMap = new Map<string, number>();
  for (const item of allItems) {
    for (const g of item.genres) {
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
    }
  }
  const genreDistribution = [...genreMap.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  // Interactions by type
  const interactionsByType = await db
    .select({
      eventType: interactionsTable.eventType,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(interactionsTable)
    .groupBy(interactionsTable.eventType)
    .orderBy(desc(sql`count`));

  // Recent activity
  const recentActivity = await db
    .select({
      eventType: interactionsTable.eventType,
      itemTitle: itemsTable.title,
      userEmail: usersTable.email,
      createdAt: interactionsTable.createdAt,
    })
    .from(interactionsTable)
    .innerJoin(itemsTable, sql`${interactionsTable.itemId} = ${itemsTable.id}`)
    .innerJoin(usersTable, sql`${interactionsTable.userId} = ${usersTable.id}`)
    .orderBy(desc(interactionsTable.createdAt))
    .limit(20);

  res.json(
    GetAnalyticsResponse.parse({
      totalUsers: Number(users?.count ?? 0),
      totalItems: Number(items?.count ?? 0),
      totalInteractions: Number(interactions?.count ?? 0),
      topItems: topItemsRows.map((r) => ({
        ...r,
        interactionCount: Number(r.interactionCount ?? 0),
      })),
      genreDistribution,
      interactionsByType: interactionsByType.map((r) => ({
        eventType: r.eventType,
        count: Number(r.count),
      })),
      recentActivity: recentActivity.map((r) => ({
        eventType: r.eventType,
        itemTitle: r.itemTitle,
        userEmail: r.userEmail ?? null,
        createdAt: r.createdAt,
      })),
    })
  );
});

// ─── TMDB Batch Import ────────────────────────────────────────────────────────

router.post("/admin/tmdb/import", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ImportTmdbMoviesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await importMoviesFromTmdb({
    type: parsed.data.type as any,
    pages: parsed.data.pages,
    genreId: parsed.data.genreId,
    year: parsed.data.year,
  });

  res.json(ImportTmdbMoviesResponse.parse(result));
});

// ─── TMDB Single Movie Refresh ────────────────────────────────────────────────

router.post("/admin/tmdb/refresh/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RefreshTmdbMovieParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  if (!item.tmdbId) {
    res.status(400).json({ error: "Item has no TMDB ID associated." });
    return;
  }

  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    res.status(400).json({ error: "TMDB_API_KEY is not configured in server environment." });
    return;
  }

  try {
    const detailed = await fetchMovieDetails(item.tmdbId);
    const normalized = normalizeTmdbMovie(detailed);

    const featureVectorMap = buildItemVector({
      ...normalized,
      id: item.id,
      createdAt: item.createdAt,
      updatedAt: new Date(),
      featureVector: [],
    } as Item);

    const [updated] = await db
      .update(itemsTable)
      .set({
        ...normalized,
        featureVector: Array.from(featureVectorMap.entries()),
        updatedAt: new Date(),
      })
      .where(eq(itemsTable.id, item.id))
      .returning();

    res.json(RefreshTmdbMovieResponse.parse({ ...updated, interactionCount: null }));
  } catch (err: any) {
    res.status(500).json({ error: `Failed to refresh TMDB movie: ${err.message}` });
  }
});

// ─── Trigger Recommender Retraining ───────────────────────────────────────────

router.post("/admin/recommender/train", requireAdmin, async (_req, res): Promise<void> => {
  const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
  try {
    const response = await fetch(`${recommenderUrl}/train`, { method: "POST" });
    if (response.ok) {
      res.json(TriggerRecommenderTrainingResponse.parse({ message: "Recommendation model retraining initiated." }));
    } else {
      res.status(500).json({ error: "Recommender service rejected training request." });
    }
  } catch (err: any) {
    res.status(503).json({ error: `Cannot reach recommender service at ${recommenderUrl}: ${err.message}` });
  }
});

export default router;
