/**
 * update-posters.ts
 *
 * Fetches poster URLs for all movies in DB that have no posterUrl.
 * Uses the IMDB suggestion API (same as the /api/images/poster endpoint).
 * Run with: pnpm tsx scripts/src/update-posters.ts
 */

import { db, itemsTable } from "@workspace/db";
import { isNull, eq } from "drizzle-orm";

const CONCURRENT = 5;
const DELAY_MS   = 200; // be polite to IMDB
const BATCH_SIZE = 1000;

async function fetchPosterUrl(title: string): Promise<string | null> {
  try {
    const clean   = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const first   = clean.charAt(0) || "a";
    const query   = encodeURIComponent(clean.replace(/\s+/g, "_"));
    const url     = `https://v3.sg.media-imdb.com/suggestion/${first}/${query}.json`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    if (data?.d?.length > 0) {
      for (const item of data.d) {
        if (item?.i?.imageUrl) return item.i.imageUrl;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runInPool<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let i = 0;

  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  console.log("🎬 Fetching poster URLs for all movies without one …");

  // Fetch items in batches
  let offset = 0;
  let totalUpdated = 0;

  while (true) {
    const items = await db
      .select({ id: itemsTable.id, title: itemsTable.title })
      .from(itemsTable)
      .where(isNull(itemsTable.posterUrl))
      .limit(BATCH_SIZE)
      .offset(offset);

    if (items.length === 0) break;
    console.log(`Processing batch of ${items.length} items (offset ${offset}) …`);

    const tasks = items.map((item) => async () => {
      const url = await fetchPosterUrl(item.title);
      await sleep(DELAY_MS);
      return { id: item.id, url };
    });

    const results = await runInPool(tasks, CONCURRENT);

    let batchUpdated = 0;
    for (const r of results) {
      if (r.url) {
        await db
          .update(itemsTable)
          .set({ posterUrl: r.url })
          .where(eq(itemsTable.id, r.id));
        batchUpdated++;
      }
    }

    totalUpdated += batchUpdated;
    console.log(`  ✓ Updated ${batchUpdated}/${items.length} posters in this batch`);
    offset += items.length;

    // If fewer items than batch, we're done
    if (items.length < BATCH_SIZE) break;
  }

  console.log(`\n✅ Done! Updated ${totalUpdated} poster URLs in total.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
