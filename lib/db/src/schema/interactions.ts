import { pgTable, serial, integer, text, real, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { itemsTable } from "./items";

export const interactionsTable = pgTable(
  "interactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    itemId: integer("item_id").notNull().references(() => itemsTable.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(), // impression, view, click, play, pause, watch_progress, watch_25, watch_50, watch_75, watch_90, complete, like, dislike, rate, add_watchlist, remove_watchlist, search, trailer_play, trailer_complete
    rating: real("rating"),
    watchDuration: integer("watch_duration"), // seconds
    metadata: text("metadata"), // extra context if needed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("interactions_user_id_idx").on(t.userId),
    index("interactions_item_id_idx").on(t.itemId),
    index("interactions_created_at_idx").on(t.createdAt),
    index("interactions_event_type_idx").on(t.eventType),
  ]
);

export const insertInteractionSchema = createInsertSchema(interactionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactionsTable.$inferSelect;
