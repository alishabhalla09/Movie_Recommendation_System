import { pgTable, serial, integer, real, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { itemsTable } from "./items";

export const watchProgressTable = pgTable(
  "watch_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    itemId: integer("item_id").notNull().references(() => itemsTable.id, { onDelete: "cascade" }),
    positionSeconds: integer("position_seconds").notNull().default(0),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    percentage: real("percentage").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    lastWatchedAt: timestamp("last_watched_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("watch_progress_user_item_unique").on(t.userId, t.itemId),
    index("watch_progress_user_id_idx").on(t.userId),
    index("watch_progress_item_id_idx").on(t.itemId),
    index("watch_progress_last_watched_idx").on(t.lastWatchedAt),
  ]
);

export const insertWatchProgressSchema = createInsertSchema(watchProgressTable).omit({
  id: true,
  lastWatchedAt: true,
  updatedAt: true,
});
export type InsertWatchProgress = z.infer<typeof insertWatchProgressSchema>;
export type WatchProgress = typeof watchProgressTable.$inferSelect;
