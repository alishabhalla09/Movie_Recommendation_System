import { Router, type IRouter } from "express";
import { db, interactionsTable, itemsTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import {
  LogInteractionBody,
  GetInteractionHistoryQueryParams,
  LogInteractionResponse,
  GetInteractionHistoryResponse,
} from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/interactions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = LogInteractionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(interactionsTable).values({
    userId: req.userId!,
    itemId: parsed.data.itemId,
    eventType: parsed.data.eventType,
    rating: parsed.data.rating ?? null,
    watchDuration: parsed.data.watchDuration ?? null,
  });

  // Asynchronously trigger training of the ML model
  const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
  fetch(`${recommenderUrl}/train`, { 
    method: "POST", 
    signal: AbortSignal.timeout(2000) 
  }).catch((e) => {
    console.log("Could not trigger ML model training:", e.message);
  });

  res.status(201).json(LogInteractionResponse.parse({ message: "Interaction logged" }));
});

router.get("/interactions/history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = GetInteractionHistoryQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;

  const interactions = await db
    .select()
    .from(interactionsTable)
    .where(eq(interactionsTable.userId, req.userId!))
    .orderBy(desc(interactionsTable.createdAt))
    .limit(limit);

  // Fetch items
  const itemIds = [...new Set(interactions.map((i) => i.itemId))];
  const items =
    itemIds.length > 0
      ? await db.select().from(itemsTable).where(inArray(itemsTable.id, itemIds))
      : [];

  const itemMap = new Map(items.map((i) => [i.id, i]));

  const result = interactions
    .map((interaction) => {
      const item = itemMap.get(interaction.itemId);
      if (!item) return null;
      return {
        id: interaction.id,
        itemId: interaction.itemId,
        eventType: interaction.eventType,
        rating: interaction.rating ?? null,
        watchDuration: interaction.watchDuration ?? null,
        createdAt: interaction.createdAt,
        item: { ...item, interactionCount: null },
      };
    })
    .filter(Boolean);

  res.json(GetInteractionHistoryResponse.parse(result));
});

export default router;
