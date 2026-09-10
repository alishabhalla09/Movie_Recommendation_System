import { db, watchlistTable, interactionsTable } from "@workspace/db";

async function backfillWatchlist() {
  console.log("Fetching watchlist entries...");
  const entries = await db.select().from(watchlistTable);
  
  if (entries.length === 0) {
    console.log("No watchlist entries found.");
    process.exit(0);
  }

  console.log(`Found ${entries.length} watchlist entries. Syncing to interactions...`);
  
  for (const entry of entries) {
    try {
      await db.insert(interactionsTable).values({
        userId: entry.userId,
        itemId: entry.itemId,
        eventType: "watch", // Watchlist is treated as a strong signal
      });
      console.log(`Synced user ${entry.userId} -> item ${entry.itemId}`);
    } catch (err) {
      console.log(`Failed to sync user ${entry.userId} -> item ${entry.itemId} (maybe already exists)`);
    }
  }

  console.log("Sync complete. Triggering ML retrain...");
  try {
    const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
    await fetch(`${recommenderUrl}/train`, { method: "POST" });
    console.log("ML retrain triggered.");
  } catch (e) {
    console.error("Failed to trigger ML retrain", e);
  }

  process.exit(0);
}

backfillWatchlist();
