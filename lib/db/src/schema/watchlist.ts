import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { itemsTable } from "./items";

export const watchlistTable = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => itemsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.itemId),
]);

export type WatchlistEntry = typeof watchlistTable.$inferSelect;
