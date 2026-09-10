import { Router, type IRouter } from "express";
import {
  GetHomeRecommendationsResponse,
  SimilarItemsResponse,
  SimilarItemsParams,
  SimilarItemsQueryParams,
  GetBecauseYouWatchedResponse,
  GetTopPicksResponse,
  GetTopPicksQueryParams,
} from "@workspace/api-zod";
import { optionalAuth, requireAuth, AuthRequest } from "../middlewares/auth";
import {
  getTrendingItems,
  getSimilarItems,
  getPersonalizedRecommendations,
  getBecauseYouWatchedRows,
} from "../lib/recommendations";
import { db, itemsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

function mapItem(item: any) {
  return { ...item, interactionCount: null };
}

// ─── Home recommendations ─────────────────────────────────────────────────────

router.get("/recommendations/home", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const rows = [];

  // Row 1: Trending Now
  const trending = await getTrendingItems(20);
  if (trending.length > 0) {
    rows.push({
      title: "Trending Now",
      reason: "trending",
      items: trending.map(mapItem),
      sourceItemTitle: null,
    });
  }

  // Row 2: Popular on StreamFlix
  const popular = await db
    .select()
    .from(itemsTable)
    .orderBy(desc(itemsTable.popularity), desc(itemsTable.rating))
    .limit(20);

  if (popular.length > 0) {
    rows.push({
      title: "Popular on StreamFlix",
      reason: "popular",
      items: popular.map(mapItem),
      sourceItemTitle: null,
    });
  }

  if (req.userId) {
    // Row 3: Top Picks For You (personalized)
    const personalized = await getPersonalizedRecommendations(req.userId, 20);
    if (personalized.length > 0) {
      rows.push({
        title: "Top Picks For You",
        reason: "top_picks",
        items: personalized.map(mapItem),
        sourceItemTitle: null,
      });
    }

    // Rows 4+: Because You Watched...
    const becauseRows = await getBecauseYouWatchedRows(req.userId);
    for (const { sourceItem, similar } of becauseRows) {
      rows.push({
        title: `Because You Watched: ${sourceItem.title}`,
        reason: "because_you_watched",
        items: similar.map(mapItem),
        sourceItemTitle: sourceItem.title,
      });
    }
  }

  // Row: New Releases
  const newReleases = await db
    .select()
    .from(itemsTable)
    .orderBy(desc(itemsTable.releaseYear), desc(itemsTable.createdAt))
    .limit(20);

  if (newReleases.length > 0) {
    rows.push({
      title: "New Releases",
      reason: "new_releases",
      items: newReleases.map(mapItem),
      sourceItemTitle: null,
    });
  }

  // Dynamic Genre Rows
  const featuredGenres = ["Sci-Fi", "Action", "Drama", "Animation", "Comedy", "Thriller"];
  for (const genre of featuredGenres) {
    const genreItems = await getTrendingItems(15, genre);
    if (genreItems.length >= 3) {
      rows.push({
        title: `${genre} Movies`,
        reason: "genre_row",
        items: genreItems.map(mapItem),
        sourceItemTitle: null,
      });
    }
  }

  res.json(GetHomeRecommendationsResponse.parse(rows));
});

// ─── Top picks ────────────────────────────────────────────────────────────────

router.get("/recommendations/top-picks", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const query = GetTopPicksQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 20) : 20;

  if (req.userId) {
    const personalized = await getPersonalizedRecommendations(req.userId, limit);
    res.json(GetTopPicksResponse.parse(personalized.map(mapItem)));
  } else {
    const trending = await getTrendingItems(limit);
    res.json(GetTopPicksResponse.parse(trending.map(mapItem)));
  }
});

// ─── Similar items ────────────────────────────────────────────────────────────

router.get("/recommendations/similar/:itemId", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;

  const params = SimilarItemsParams.safeParse({ itemId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = SimilarItemsQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 12) : 12;

  const similar = await getSimilarItems(params.data.itemId, limit);

  res.json(SimilarItemsResponse.parse(similar.map(mapItem)));
});

// ─── Because you watched ──────────────────────────────────────────────────────

router.get("/recommendations/because-you-watched", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const becauseRows = await getBecauseYouWatchedRows(req.userId!);

  const rows = becauseRows.map(({ sourceItem, similar }) => ({
    title: `Because You Watched: ${sourceItem.title}`,
    reason: "because_you_watched",
    items: similar.map(mapItem),
    sourceItemTitle: sourceItem.title,
  }));

  res.json(GetBecauseYouWatchedResponse.parse(rows));
});

export default router;
