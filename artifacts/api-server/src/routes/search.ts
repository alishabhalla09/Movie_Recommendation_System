import { Router, type IRouter } from "express";
import { db, itemsTable } from "@workspace/db";
import { sql, and, gte, eq, desc } from "drizzle-orm";
import {
  SearchItemsQueryParams,
  SearchItemsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, genre, minRating, year, limit = 60 } = parsed.data;

  const searchTerm = (q ?? "").trim();
  const hasGenre = !!genre;
  const hasRating = minRating != null && minRating > 0;
  const hasYear = year != null && year > 1900;
  const hasQuery = searchTerm.length > 0;

  // If completely empty, return popular items as suggestions
  if (!hasQuery && !hasGenre && !hasRating && !hasYear) {
    const popular = await db
      .select()
      .from(itemsTable)
      .orderBy(desc(itemsTable.popularity), desc(itemsTable.rating))
      .limit(limit);

    res.json(SearchItemsResponse.parse(popular.map((i) => ({ ...i, interactionCount: null }))));
    return;
  }

  const conditions: any[] = [];

  // Match title, description, director, cast, tags
  if (hasQuery) {
    conditions.push(
      sql`(
        ${itemsTable.title} ILIKE ${"%" + searchTerm + "%"}
        OR ${itemsTable.description} ILIKE ${"%" + searchTerm + "%"}
        OR ${itemsTable.director} ILIKE ${"%" + searchTerm + "%"}
        OR array_to_string(${itemsTable.cast}, ' ') ILIKE ${"%" + searchTerm + "%"}
        OR array_to_string(${itemsTable.tags}, ' ') ILIKE ${"%" + searchTerm + "%"}
        OR array_to_string(${itemsTable.genres}, ' ') ILIKE ${"%" + searchTerm + "%"}
      )`
    );
  }

  if (hasRating) {
    conditions.push(gte(itemsTable.rating, minRating!));
  }

  if (hasYear) {
    conditions.push(eq(itemsTable.releaseYear, year!));
  }

  let items = await db
    .select()
    .from(itemsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(itemsTable.popularity), desc(itemsTable.rating))
    .limit(limit * 2);

  // Genre filter
  if (hasGenre) {
    items = items.filter((i) => i.genres.some((g) => g.toLowerCase() === genre!.toLowerCase()));
  }

  res.json(
    SearchItemsResponse.parse(items.slice(0, limit).map((i) => ({ ...i, interactionCount: null })))
  );
});

export default router;
