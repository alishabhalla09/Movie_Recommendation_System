import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  "streamflix-secret-key-change-in-production";


export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  isAdmin?: boolean;
}

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.userId = user.id;
  req.userEmail = user.email;
  req.isAdmin = user.isAdmin;
  next();
}

export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
    }
  }
  next();
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    if (!req.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
