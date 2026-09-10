import { Router, type IRouter } from "express";
import { db, itemsTable, interactionsTable } from "@workspace/db";
import { eq, desc, sql, inArray } from "drizzle-orm";
import {
  ListItemsQueryParams,
  GetTrendingQueryParams,
  GetPopularQueryParams,
  GetNewReleasesQueryParams,
  GetItemParams,
  GetItemTrailerParams,
  GetItemsByGenreParams,
  GetItemsByGenreQueryParams,
  CreateItemBody,
  UpdateItemParams,
  UpdateItemBody,
  DeleteItemParams,
  ListItemsResponse,
  GetTrendingResponse,
  GetPopularResponse,
  GetNewReleasesResponse,
  ListGenresResponse,
  GetItemResponse,
  GetItemTrailerResponse,
  GetItemsByGenreResponse,
  CreateItemResponse,
  UpdateItemResponse,
  DeleteItemResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { getTrendingItems } from "../lib/recommendations";

const router: IRouter = Router();

// ─── List items ──────────────────────────────────────────────────────────────

router.get("/items", async (req, res): Promise<void> => {
  const parsed = ListItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { genre, page = 1, limit = 20, sortBy = "new" } = parsed.data;
  const offset = (page - 1) * limit;

  let query = db.select().from(itemsTable);

  let items;
  if (sortBy === "popular") {
    items = await query.orderBy(desc(itemsTable.popularity), desc(itemsTable.rating)).limit(limit + 1).offset(offset);
  } else if (sortBy === "rating") {
    items = await query.orderBy(desc(itemsTable.rating)).limit(limit + 1).offset(offset);
  } else if (sortBy === "releaseYear") {
    items = await query.orderBy(desc(itemsTable.releaseYear)).limit(limit + 1).offset(offset);
  } else {
    items = await query.orderBy(desc(itemsTable.createdAt)).limit(limit + 1).offset(offset);
  }

  const hasMore = items.length > limit;
  if (hasMore) items = items.slice(0, limit);

  let filtered = items;
  if (genre) {
    filtered = items.filter((i) => i.genres.includes(genre));
  }

  // Get interaction counts
  const itemIds = filtered.map((i) => i.id);
  const counts =
    itemIds.length > 0
      ? await db
          .select({
            itemId: interactionsTable.itemId,
            count: sql<number>`COUNT(*)`.as("count"),
          })
          .from(interactionsTable)
          .where(inArray(interactionsTable.itemId, itemIds))
          .groupBy(interactionsTable.itemId)
      : [];

  const countMap = new Map(counts.map((c) => [c.itemId, Number(c.count)]));

  const total = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(itemsTable)
    .then((r) => Number(r[0]?.count ?? 0));

  res.json(
    ListItemsResponse.parse({
      items: filtered.map((item) => ({
        ...item,
        interactionCount: countMap.get(item.id) ?? 0,
      })),
      total,
      page,
      limit,
    })
  );
});

// ─── Trending ────────────────────────────────────────────────────────────────

router.get("/items/trending", async (req, res): Promise<void> => {
  const parsed = GetTrendingQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { limit = 20, genre } = parsed.data;
  const items = await getTrendingItems(limit, genre ?? undefined);

  res.json(GetTrendingResponse.parse(items.map((item) => ({ ...item, interactionCount: null }))));
});

// ─── Popular ─────────────────────────────────────────────────────────────────

router.get("/items/popular", async (req, res): Promise<void> => {
  const parsed = GetPopularQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { limit = 20, genre } = parsed.data;

  let items = await db
    .select()
    .from(itemsTable)
    .orderBy(desc(itemsTable.popularity), desc(itemsTable.rating))
    .limit(limit * 2);

  if (genre) {
    items = items.filter((i) => i.genres.includes(genre));
  }

  res.json(GetPopularResponse.parse(items.slice(0, limit).map((item) => ({ ...item, interactionCount: null }))));
});

// ─── New releases ─────────────────────────────────────────────────────────────

router.get("/items/new-releases", async (req, res): Promise<void> => {
  const parsed = GetNewReleasesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { limit = 20 } = parsed.data;

  const items = await db
    .select()
    .from(itemsTable)
    .orderBy(desc(itemsTable.releaseYear), desc(itemsTable.createdAt))
    .limit(limit);

  res.json(GetNewReleasesResponse.parse(items.map((item) => ({ ...item, interactionCount: null }))));
});

// ─── Genres ───────────────────────────────────────────────────────────────────

router.get("/items/genres", async (_req, res): Promise<void> => {
  const items = await db.select({ genres: itemsTable.genres }).from(itemsTable);

  const genreSet = new Set<string>();
  for (const item of items) {
    for (const g of item.genres) {
      genreSet.add(g);
    }
  }

  res.json(ListGenresResponse.parse([...genreSet].sort()));
});

// ─── Genre page items ────────────────────────────────────────────────────────

router.get("/items/genre/:genre", async (req, res): Promise<void> => {
  const rawGenre = Array.isArray(req.params.genre) ? req.params.genre[0] : req.params.genre;
  const genreParam = GetItemsByGenreParams.safeParse({ genre: decodeURIComponent(rawGenre) });
  if (!genreParam.success) {
    res.status(400).json({ error: genreParam.error.message });
    return;
  }

  const queryParam = GetItemsByGenreQueryParams.safeParse(req.query);
  const { page = 1, limit = 20, sortBy = "popular" } = queryParam.success ? queryParam.data : { page: 1, limit: 20, sortBy: "popular" };
  const targetGenre = genreParam.data.genre;
  const offset = (page - 1) * limit;

  let allGenreItems = await db
    .select()
    .from(itemsTable)
    .where(sql`${itemsTable.genres} @> ARRAY[${targetGenre}]::text[]`);

  if (sortBy === "popular") {
    allGenreItems.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || b.rating - a.rating);
  } else if (sortBy === "rating") {
    allGenreItems.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === "new") {
    allGenreItems.sort((a, b) => b.releaseYear - a.releaseYear);
  }

  const total = allGenreItems.length;
  const paginated = allGenreItems.slice(offset, offset + limit);

  res.json(
    GetItemsByGenreResponse.parse({
      items: paginated.map((item) => ({
        ...item,
        interactionCount: null,
      })),
      total,
      page,
      limit,
    })
  );
});

// ─── Single item ──────────────────────────────────────────────────────────────

router.get("/items/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetItemParams.safeParse({ id: rawId });
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

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(interactionsTable)
    .where(eq(interactionsTable.itemId, item.id));

  res.json(
    GetItemResponse.parse({
      ...item,
      interactionCount: Number(countRow?.count ?? 0),
    })
  );
});

// ─── Item Trailer ─────────────────────────────────────────────────────────────

router.get("/items/:id/trailer", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetItemTrailerParams.safeParse({ id: rawId });
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

  const trailerKey = item.trailerKey;
  const available = Boolean(trailerKey);

  res.json(
    GetItemTrailerResponse.parse({
      available,
      key: trailerKey ?? null,
      site: item.trailerSite ?? (trailerKey ? "YouTube" : null),
      name: item.trailerName ?? `${item.title} Trailer`,
      type: "Trailer",
      embedUrl: trailerKey ? `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0` : null,
    })
  );
});

// ─── Admin: create item ───────────────────────────────────────────────────────

router.post("/admin/items", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db.insert(itemsTable).values(parsed.data).returning();

  res.status(201).json(CreateItemResponse.parse({ ...item, interactionCount: 0 }));
});

// ─── Admin: update item ───────────────────────────────────────────────────────

router.patch("/admin/items/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateItemParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .update(itemsTable)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(itemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(UpdateItemResponse.parse({ ...item, interactionCount: null }));
});

// ─── Admin: delete item ───────────────────────────────────────────────────────

router.delete("/admin/items/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteItemParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(itemsTable)
    .where(eq(itemsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(DeleteItemResponse.parse({ message: "Item deleted" }));
});

export { router as itemsRouter };
export default router;
