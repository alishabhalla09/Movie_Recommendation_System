import { Router, type IRouter } from "express";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  GetReviewsParams,
  CreateReviewBody,
  GetReviewsResponse,
  CreateReviewResponse,
  CreateReviewParams,
} from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reviews/:itemId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const params = GetReviewsParams.safeParse({ itemId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const reviews = await db
    .select({
      id: reviewsTable.id,
      itemId: reviewsTable.itemId,
      userId: reviewsTable.userId,
      userEmail: usersTable.email,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
    })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.itemId, params.data.itemId))
    .orderBy(desc(reviewsTable.createdAt));

  res.json(GetReviewsResponse.parse(reviews));
});

router.post("/reviews/:itemId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const params = GetReviewsParams.safeParse({ itemId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Upsert: one review per user per item
  const [review] = await db
    .insert(reviewsTable)
    .values({
      userId: req.userId!,
      itemId: params.data.itemId,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    })
    .onConflictDoUpdate({
      target: [reviewsTable.userId, reviewsTable.itemId],
      set: {
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
      },
    })
    .returning();

  res.status(201).json(
    CreateReviewResponse.parse({
      ...review,
      userEmail: req.userEmail ?? null,
    })
  );
});

export default router;
