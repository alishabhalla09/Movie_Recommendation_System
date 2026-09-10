import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  SignupBody,
  LoginBody,
  SignupResponse,
  LoginResponse,
  GetMeResponse,
  LogoutResponse,
} from "@workspace/api-zod";
import { signToken, requireAuth, AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash })
    .returning();

  const token = signToken(user.id);

  res.status(201).json(
    SignupResponse.parse({
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        hasOnboarded: (user.preferences as any)?.hasOnboarded || false,
        createdAt: user.createdAt,
      },
      token,
    })
  );
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id);

  res.json(
    LoginResponse.parse({
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        hasOnboarded: (user.preferences as any)?.hasOnboarded || false,
        createdAt: user.createdAt,
      },
      token,
    })
  );
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json(LogoutResponse.parse({ message: "Logged out" }));
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    GetMeResponse.parse({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      hasOnboarded: (user.preferences as any)?.hasOnboarded || false,
      createdAt: user.createdAt,
    })
  );
});

router.post("/auth/onboard", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const itemIds = req.body?.itemIds;
  
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    res.status(400).json({ error: "Invalid itemIds array" });
    return;
  }

  const interactionsToInsert = itemIds.map(itemId => ({
    userId: req.userId!,
    itemId,
    eventType: "watch", // give them a strong baseline
    createdAt: new Date(),
  }));

  try {
    const { interactionsTable } = await import("@workspace/db");
    await db.insert(interactionsTable).values(interactionsToInsert).onConflictDoNothing();

    // Update user preferences to hasOnboarded
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (user) {
      const prefs = (user.preferences as Record<string, any>) || {};
      prefs.hasOnboarded = true;
      await db.update(usersTable).set({ preferences: prefs }).where(eq(usersTable.id, req.userId!));
    }

    // Trigger ML retrain
    const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
    fetch(`${recommenderUrl}/train`, { 
      method: "POST",
      signal: AbortSignal.timeout(2000)
    }).catch(() => {});

    res.json({ message: "Onboarding completed successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
