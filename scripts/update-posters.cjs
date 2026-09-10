#!/usr/bin/env node
/**
 * Fast poster fetcher - uses pg directly to avoid workspace dep issues
 * Run: DATABASE_URL="..." node scripts/update-posters.cjs
 */

const { Client } = require("pg");

const DB_URL    = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/mediahub";
const CONCURRENT = 8;
const DELAY_MS   = 150;
const BATCH_LIMIT = 9999; // fetch all at once

async function fetchPosterUrl(title) {
  try {
    const clean = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const first = clean.charAt(0) || "a";
    const query = encodeURIComponent(clean.replace(/\s+/g, "_"));
    const url   = `https://v3.sg.media-imdb.com/suggestion/${first}/${query}.json`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const { rows: items } = await client.query(
    `SELECT id, title FROM items WHERE poster_url IS NULL ORDER BY id LIMIT $1`,
    [BATCH_LIMIT]
  );

  console.log(`🎬 Found ${items.length} movies without posters. Fetching…`);

  let updated = 0;
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx  = i++;
      const item = items[idx];
      const url  = await fetchPosterUrl(item.title);
      await sleep(DELAY_MS);

      if (url) {
        await client.query(`UPDATE items SET poster_url = $1 WHERE id = $2`, [url, item.id]);
        updated++;
        if (updated % 50 === 0) {
          console.log(`  ✓ ${updated} posters saved so far… (${idx + 1}/${items.length})`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENT }, () => worker()));

  console.log(`\n✅ Done! Saved ${updated} poster URLs out of ${items.length} movies.`);
  await client.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
