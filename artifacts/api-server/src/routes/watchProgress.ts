import { Router, type IRouter } from "express";
import { db, itemsTable, watchProgressTable, interactionsTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  GetWatchProgressParams,
  SaveWatchProgressParams,
  SaveWatchProgressBody,
  GetWatchProgressResponse,
  SaveWatchProgressResponse,
  GetContinueWatchingResponse,
} from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

// ─── Get Continue Watching list ──────────────────────────────────────────────

router.get("/watch-progress/continue-watching", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const progressRows = await db
    .select()
    .from(watchProgressTable)
    .where(
      and(
        eq(watchProgressTable.userId, userId),
        eq(watchProgressTable.completed, false),
        sql`${watchProgressTable.positionSeconds} > 15`
      )
    )
    .orderBy(desc(watchProgressTable.lastWatchedAt))
    .limit(20);

  if (progressRows.length === 0) {
    res.json(GetContinueWatchingResponse.parse([]));
    return;
  }

  const itemIds = progressRows.map((p) => p.itemId);
  const items = await db
    .select()
    .from(itemsTable)
    .where(inArray(itemsTable.id, itemIds));

  const itemMap = new Map(items.map((i) => [i.id, i]));

  const result = progressRows
    .map((progress) => {
      const item = itemMap.get(progress.itemId);
      if (!item) return null;
      return {
        item: { ...item, interactionCount: null },
        progress: {
          id: progress.id,
          userId: progress.userId,
          itemId: progress.itemId,
          positionSeconds: progress.positionSeconds,
          durationSeconds: progress.durationSeconds,
          percentage: progress.percentage,
          completed: progress.completed,
          lastWatchedAt: progress.lastWatchedAt,
        },
      };
    })
    .filter(Boolean);

  res.json(GetContinueWatchingResponse.parse(result));
});

// ─── Get progress for specific item ──────────────────────────────────────────

router.get("/watch-progress/:itemId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const params = GetWatchProgressParams.safeParse({ itemId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.userId!;
  const [progress] = await db
    .select()
    .from(watchProgressTable)
    .where(
      and(
        eq(watchProgressTable.userId, userId),
        eq(watchProgressTable.itemId, params.data.itemId)
      )
    );

  if (!progress) {
    res.json(
      GetWatchProgressResponse.parse({
        id: 0,
        userId,
        itemId: params.data.itemId,
        positionSeconds: 0,
        durationSeconds: 0,
        percentage: 0,
        completed: false,
        lastWatchedAt: new Date(),
      })
    );
    return;
  }

  res.json(
    GetWatchProgressResponse.parse({
      id: progress.id,
      userId: progress.userId,
      itemId: progress.itemId,
      positionSeconds: progress.positionSeconds,
      durationSeconds: progress.durationSeconds,
      percentage: progress.percentage,
      completed: progress.completed,
      lastWatchedAt: progress.lastWatchedAt,
    })
  );
});

// ─── Save watch progress ─────────────────────────────────────────────────────

router.post("/watch-progress/:itemId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const params = SaveWatchProgressParams.safeParse({ itemId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SaveWatchProgressBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userId = req.userId!;
  const { positionSeconds, durationSeconds } = body.data;
  const percentage = durationSeconds > 0 ? Math.min(100, Math.round((positionSeconds / durationSeconds) * 100)) : 0;
  const completed = percentage >= 90;

  const [existing] = await db
    .select()
    .from(watchProgressTable)
    .where(
      and(
        eq(watchProgressTable.userId, userId),
        eq(watchProgressTable.itemId, params.data.itemId)
      )
    );

  let updatedProgress;
  if (existing) {
    [updatedProgress] = await db
      .update(watchProgressTable)
      .set({
        positionSeconds,
        durationSeconds,
        percentage,
        completed,
        lastWatchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(watchProgressTable.id, existing.id))
      .returning();
  } else {
    [updatedProgress] = await db
      .insert(watchProgressTable)
      .values({
        userId,
        itemId: params.data.itemId,
        positionSeconds,
        durationSeconds,
        percentage,
        completed,
        lastWatchedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
  }

  // Log milestone interactions for recommendation engine
  try {
    let milestoneEvent: string | null = null;
    if (completed) {
      milestoneEvent = "complete";
    } else if (percentage >= 75) {
      milestoneEvent = "watch_75";
    } else if (percentage >= 50) {
      milestoneEvent = "watch_50";
    } else if (percentage >= 25) {
      milestoneEvent = "watch_25";
    } else if (positionSeconds > 15) {
      milestoneEvent = "watch_progress";
    }

    if (milestoneEvent) {
      await db.insert(interactionsTable).values({
        userId,
        itemId: params.data.itemId,
        eventType: milestoneEvent,
        watchDuration: positionSeconds,
      });
    }
  } catch (err) {
    console.error("Failed to log watch progress interaction", err);
  }

  res.json(
    SaveWatchProgressResponse.parse({
      id: updatedProgress.id,
      userId: updatedProgress.userId,
      itemId: updatedProgress.itemId,
      positionSeconds: updatedProgress.positionSeconds,
      durationSeconds: updatedProgress.durationSeconds,
      percentage: updatedProgress.percentage,
      completed: updatedProgress.completed,
      lastWatchedAt: updatedProgress.lastWatchedAt,
    })
  );
});

export default router;
