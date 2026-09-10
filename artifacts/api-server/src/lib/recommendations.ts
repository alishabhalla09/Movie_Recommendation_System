import { db, itemsTable, interactionsTable, watchProgressTable, Item } from "@workspace/db";
import { desc, sql, inArray, notInArray, ne, eq, and } from "drizzle-orm";

// ─── Configurable Event Weights ──────────────────────────────────────────────

export const EVENT_WEIGHTS: Record<string, number> = {
  rating: 8,
  rate: 8,
  like: 7,
  complete: 7,
  watch_90: 6,
  watchlist: 5,
  add_watchlist: 5,
  watch_75: 5,
  watch_50: 4,
  watch_25: 3,
  watch: 3,
  play: 3,
  purchase: 5,
  trailer_complete: 2,
  trailer_play: 2,
  click: 2,
  view: 1,
  impression: 0.2,
};

// ─── Popularity & Trending with Recency Decay ────────────────────────────────

export async function getTrendingItems(
  limit = 20,
  genre?: string,
  excludeIds: number[] = []
): Promise<Item[]> {
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72h window

  // Calculate score with recency decay
  const recentCounts = await db
    .select({
      itemId: interactionsTable.itemId,
      score: sql<number>`
        SUM(
          CASE event_type
            WHEN 'rate' THEN 8
            WHEN 'like' THEN 7
            WHEN 'complete' THEN 7
            WHEN 'watch_90' THEN 6
            WHEN 'add_watchlist' THEN 5
            WHEN 'watchlist' THEN 5
            WHEN 'purchase' THEN 5
            WHEN 'watch_75' THEN 5
            WHEN 'watch_50' THEN 4
            WHEN 'watch_25' THEN 3
            WHEN 'play' THEN 3
            WHEN 'watch' THEN 3
            WHEN 'trailer_play' THEN 2
            WHEN 'trailer_complete' THEN 2
            WHEN 'click' THEN 2
            WHEN 'view' THEN 1
            ELSE 0.5
          END
          * GREATEST(0.1, 1.0 - EXTRACT(EPOCH FROM (NOW() - created_at)) / (72 * 3600))
        )
      `.as("score"),
    })
    .from(interactionsTable)
    .where(sql`created_at >= ${cutoff.toISOString()}`)
    .groupBy(interactionsTable.itemId)
    .orderBy(desc(sql`score`))
    .limit(limit * 3);

  if (recentCounts.length === 0) {
    // Fallback: popularity descending
    let query = db.select().from(itemsTable);
    let items = await query.orderBy(desc(itemsTable.popularity), desc(itemsTable.rating)).limit(limit * 2);
    if (genre) {
      items = items.filter((i) => i.genres.some((g) => g.toLowerCase() === genre.toLowerCase()));
    }
    const filtered = excludeIds.length > 0 ? items.filter((i) => !excludeIds.includes(i.id)) : items;
    return applyDiversityFilter(filtered, limit);
  }

  const topItemIds = recentCounts
    .filter((r) => !excludeIds.includes(r.itemId))
    .map((r) => r.itemId)
    .slice(0, limit * 2);

  if (topItemIds.length === 0) return [];

  const items = await db
    .select()
    .from(itemsTable)
    .where(inArray(itemsTable.id, topItemIds));

  const scoreMap = new Map(recentCounts.map((r) => [r.itemId, r.score]));
  let sorted = items.sort(
    (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0)
  );

  if (genre) {
    sorted = sorted.filter((i) => i.genres.some((g) => g.toLowerCase() === genre.toLowerCase()));
  }

  return applyDiversityFilter(sorted, limit);
}

// ─── Content-Based Feature Vector Building ───────────────────────────────────

export function buildItemVector(item: Item): Map<string, number> {
  const terms: string[] = [];

  // Genres (weight x4)
  for (const g of item.genres || []) {
    const clean = g.toLowerCase().trim();
    terms.push(clean, clean, clean, clean);
  }

  // Tags & Keywords (weight x2)
  for (const t of item.tags || []) {
    const clean = t.toLowerCase().trim();
    terms.push(clean, clean);
  }

  // Director (weight x3)
  if (item.director) {
    const dir = `director_${item.director.toLowerCase().replace(/\s+/g, "_")}`;
    terms.push(dir, dir, dir);
  }

  // Cast (weight x2)
  for (const actor of (item.cast || []).slice(0, 5)) {
    const act = `actor_${actor.toLowerCase().replace(/\s+/g, "_")}`;
    terms.push(act, act);
  }

  // Type & Language
  if (item.type) terms.push(item.type.toLowerCase());
  if (item.originalLanguage) terms.push(`lang_${item.originalLanguage.toLowerCase()}`);

  // Decade
  if (item.releaseYear) {
    const decade = Math.floor(item.releaseYear / 10) * 10;
    terms.push(`decade_${decade}`);
  }

  const tf = new Map<string, number>();
  for (const term of terms) {
    tf.set(term, (tf.get(term) ?? 0) + 1);
  }

  // L2 Normalization
  let norm = 0;
  for (const val of tf.values()) {
    norm += val * val;
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (const [k, v] of tf.entries()) {
      tf.set(k, v / norm);
    }
  }

  return tf;
}

export function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dot = 0;
  for (const [term, valA] of a.entries()) {
    const valB = b.get(term);
    if (valB) {
      dot += valA * valB;
    }
  }
  return dot;
}

// ─── Diversity Filter ────────────────────────────────────────────────────────

export function applyDiversityFilter(items: Item[], limit: number): Item[] {
  const result: Item[] = [];
  const genreCounts = new Map<string, number>();
  const directorCounts = new Map<string, number>();

  for (const item of items) {
    if (result.length >= limit) break;

    const primaryGenre = item.genres?.[0] || "Unknown";
    const dir = item.director || "Unknown";

    const gCount = genreCounts.get(primaryGenre) ?? 0;
    const dCount = directorCounts.get(dir) ?? 0;

    // Avoid clustering more than 3 of the exact same primary genre or director consecutively
    if (gCount >= 4 && result.length < items.length - 2) {
      continue;
    }
    if (dCount >= 2 && dir !== "Unknown") {
      continue;
    }

    result.push(item);
    genreCounts.set(primaryGenre, gCount + 1);
    directorCounts.set(dir, dCount + 1);
  }

  // If filtered too aggressively, fill remaining slots
  if (result.length < limit && items.length > result.length) {
    const remaining = items.filter((i) => !result.some((r) => r.id === i.id));
    result.push(...remaining.slice(0, limit - result.length));
  }

  return result.slice(0, limit);
}

// ─── Similar Items (Hybrid: ALS + Content-Based) ─────────────────────────────

export async function getSimilarItems(
  itemId: number,
  limit = 12,
  excludeIds: number[] = []
): Promise<Item[]> {
  // 1. Try Python Collaborative Filtering service
  try {
    const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
    const response = await fetch(`${recommenderUrl}/similar/${itemId}?limit=${limit + excludeIds.length + 5}`, {
      signal: AbortSignal.timeout(1200),
    });
    if (response.ok) {
      const data: any = await response.json();
      if (data.similar && data.similar.length > 0) {
        const itemIds = data.similar
          .map((r: any) => r.item_id)
          .filter((id: number) => !excludeIds.includes(id) && id !== itemId);

        if (itemIds.length > 0) {
          const mlItems = await db
            .select()
            .from(itemsTable)
            .where(inArray(itemsTable.id, itemIds));

          const mlItemMap = new Map(mlItems.map((i) => [i.id, i]));
          const sortedMlItems = itemIds
            .map((id: number) => mlItemMap.get(id))
            .filter(Boolean) as Item[];

          if (sortedMlItems.length >= Math.min(limit, 4)) {
            return applyDiversityFilter(sortedMlItems, limit);
          }
        }
      }
    }
  } catch (error) {
    // Graceful fallback to content-based
  }

  // 2. Content-Based TF-IDF Cosine Similarity Fallback
  const [sourceItem] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, itemId));

  if (!sourceItem) return [];

  const allItems = await db
    .select()
    .from(itemsTable)
    .where(ne(itemsTable.id, itemId));

  const sourceVec = buildItemVector(sourceItem);

  const scored = allItems
    .filter((i) => !excludeIds.includes(i.id))
    .map((item) => ({
      item,
      score: cosineSimilarity(sourceVec, buildItemVector(item)),
    }))
    .sort((a, b) => b.score - a.score);

  return applyDiversityFilter(scored.map((s) => s.item), limit);
}

// ─── User Profile & Hybrid Personalized Recommendations ──────────────────────

async function buildUserProfileVector(
  userId: number
): Promise<{ vector: Map<string, number>; interactedIds: number[] }> {
  const interactions = await db
    .select()
    .from(interactionsTable)
    .where(eq(interactionsTable.userId, userId))
    .orderBy(desc(interactionsTable.createdAt))
    .limit(100);

  if (interactions.length === 0) {
    return { vector: new Map(), interactedIds: [] };
  }

  const interactedIds = [...new Set(interactions.map((i) => i.itemId))];

  const items = await db
    .select()
    .from(itemsTable)
    .where(inArray(itemsTable.id, interactedIds));

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const profileVec = new Map<string, number>();
  let totalWeight = 0;

  for (const interaction of interactions) {
    const item = itemMap.get(interaction.itemId);
    if (!item) continue;

    const weight = EVENT_WEIGHTS[interaction.eventType] ?? 1;
    const itemVec = buildItemVector(item);

    for (const [term, val] of itemVec.entries()) {
      profileVec.set(term, (profileVec.get(term) ?? 0) + val * weight);
    }
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    for (const [k, v] of profileVec.entries()) {
      profileVec.set(k, v / totalWeight);
    }
  }

  return { vector: profileVec, interactedIds };
}

export async function getPersonalizedRecommendations(
  userId: number,
  limit = 20
): Promise<Item[]> {
  const { vector: profileVec, interactedIds } = await buildUserProfileVector(userId);

  // Exclude completed or fully watched movies
  const completedRows = await db
    .select({ itemId: watchProgressTable.itemId })
    .from(watchProgressTable)
    .where(and(eq(watchProgressTable.userId, userId), eq(watchProgressTable.completed, true)));

  const allExcluded = [...new Set([...interactedIds, ...completedRows.map((c) => c.itemId)])];

  if (profileVec.size === 0) {
    // Cold start -> Popular & Trending
    return getTrendingItems(limit, undefined, allExcluded);
  }

  // 1. Try Python ALS Collaborative Filtering
  let alsScores = new Map<number, number>();
  try {
    const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
    const response = await fetch(`${recommenderUrl}/recommend/${userId}?limit=${limit * 2}`, {
      signal: AbortSignal.timeout(1200),
    });

    if (response.ok) {
      const data: any = await response.json();
      if (data.recommendations && Array.isArray(data.recommendations)) {
        for (const r of data.recommendations) {
          alsScores.set(r.item_id, r.score);
        }
      }
    }
  } catch (err) {
    // Silent fallback to content + trending
  }

  // 2. Fetch candidates from DB
  const candidates = await db
    .select()
    .from(itemsTable)
    .where(
      allExcluded.length > 0
        ? notInArray(itemsTable.id, allExcluded)
        : sql`true`
    );

  if (candidates.length === 0) {
    return db.select().from(itemsTable).limit(limit);
  }

  // 3. Compute Hybrid Ranking Score: ALS (0.45) + Content (0.30) + Trending/Popularity (0.25)
  const maxPopularity = Math.max(...candidates.map((c) => c.popularity ?? 0), 1);

  const scored = candidates
    .map((item) => {
      const contentScore = cosineSimilarity(profileVec, buildItemVector(item));
      const collabScore = alsScores.get(item.id) ?? 0;
      const popScore = (item.popularity ?? 0) / maxPopularity;
      const ratingScore = (item.rating ?? 0) / 10;

      const finalScore =
        (collabScore > 0 ? collabScore * 0.45 : 0) +
        contentScore * (collabScore > 0 ? 0.35 : 0.60) +
        popScore * 0.10 +
        ratingScore * 0.10;

      return { item, score: finalScore };
    })
    .sort((a, b) => b.score - a.score);

  return applyDiversityFilter(scored.map((s) => s.item), limit);
}

// ─── "Because You Watched X" ──────────────────────────────────────────────────

export async function getBecauseYouWatchedRows(userId: number): Promise<
  Array<{
    sourceItem: Item;
    similar: Item[];
  }>
> {
  const recentInteractions = await db
    .select()
    .from(interactionsTable)
    .where(eq(interactionsTable.userId, userId))
    .orderBy(desc(interactionsTable.createdAt))
    .limit(50);

  if (recentInteractions.length === 0) return [];

  // Pick top 3 unique watched items
  const seenItemIds = new Set<number>();
  const uniqueInteractions: typeof recentInteractions = [];

  for (const interaction of recentInteractions) {
    if (!seenItemIds.has(interaction.itemId)) {
      seenItemIds.add(interaction.itemId);
      uniqueInteractions.push(interaction);
    }
    if (uniqueInteractions.length >= 3) break;
  }

  const allInteractedIds = [...seenItemIds];
  const results: Array<{ sourceItem: Item; similar: Item[] }> = [];

  for (const interaction of uniqueInteractions) {
    const [sourceItem] = await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.id, interaction.itemId));

    if (!sourceItem) continue;

    const similar = await getSimilarItems(sourceItem.id, 12, allInteractedIds);

    if (similar.length > 0) {
      results.push({ sourceItem, similar });
    }
  }

  return results;
}
