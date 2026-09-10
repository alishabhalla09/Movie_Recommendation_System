import { Router, type IRouter } from "express";
import { db, watchlistTable, itemsTable, interactionsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  AddToWatchlistParams,
  RemoveFromWatchlistParams,
  CheckWatchlistParams,
  GetWatchlistResponse,
  AddToWatchlistResponse,
  RemoveFromWatchlistResponse,
  CheckWatchlistResponse,
} from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/watchlist", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const entries = await db
    .select()
    .from(watchlistTable)
    .where(eq(watchlistTable.userId, req.userId!));

  const itemIds = entries.map((e) => e.itemId);
  const items =
    itemIds.length > 0
      ? await db.select().from(itemsTable).where(inArray(itemsTable.id, itemIds))
      : [];

  res.json(GetWatchlistResponse.parse(items.map((i) => ({ ...i, interactionCount: null }))));
});

router.post("/watchlist/:itemId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const params = AddToWatchlistParams.safeParse({ itemId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    await db.insert(watchlistTable).values({
      userId: req.userId!,
      itemId: params.data.itemId,
    });

    // Automatically log an interaction for ML model
    await db.insert(interactionsTable).values({
      userId: req.userId!,
      itemId: params.data.itemId,
      eventType: "watch", // Watchlist is treated as a strong signal
    });

    // Trigger ML model retrain
    const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
    fetch(`${recommenderUrl}/train`, { method: "POST" }).catch(() => {});

    res.status(201).json(AddToWatchlistResponse.parse({ message: "Added to watchlist" }));
  } catch {
    res.status(409).json({ error: "Already in watchlist" });
  }
});

router.delete("/watchlist/:itemId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const params = RemoveFromWatchlistParams.safeParse({ itemId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(watchlistTable)
    .where(
      and(
        eq(watchlistTable.userId, req.userId!),
        eq(watchlistTable.itemId, params.data.itemId)
      )
    );

  res.json(RemoveFromWatchlistResponse.parse({ message: "Removed from watchlist" }));
});

router.get("/watchlist/check/:itemId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const params = CheckWatchlistParams.safeParse({ itemId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .select()
    .from(watchlistTable)
    .where(
      and(
        eq(watchlistTable.userId, req.userId!),
        eq(watchlistTable.itemId, params.data.itemId)
      )
    );

  res.json(CheckWatchlistResponse.parse({ inWatchlist: !!entry }));
});

export default router;
