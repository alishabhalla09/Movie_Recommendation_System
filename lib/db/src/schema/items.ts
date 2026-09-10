import { pgTable, serial, text, real, integer, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itemsTable = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    tmdbId: integer("tmdb_id"),
    title: text("title").notNull(),
    tagline: text("tagline"),
    description: text("description").notNull(),
    genres: text("genres").array().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    rating: real("rating").notNull().default(0),
    voteCount: integer("vote_count").notNull().default(0),
    popularity: real("popularity").notNull().default(0),
    releaseYear: integer("release_year").notNull(),
    releaseDate: text("release_date"),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    logoUrl: text("logo_url"),
    trailerUrl: text("trailer_url"),
    trailerKey: text("trailer_key"),
    trailerSite: text("trailer_site").default("YouTube"),
    trailerName: text("trailer_name"),
    duration: integer("duration"), // runtime in minutes
    director: text("director"),
    cast: text("cast").array().notNull().default([]),
    originalLanguage: text("original_language"),
    country: text("country"),
    type: text("type").notNull().default("movie"),
    metadata: jsonb("metadata").default({}),
    // TF-IDF content vector stored as JSON array/map for content-based filtering
    featureVector: jsonb("feature_vector").default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("items_tmdb_id_unique").on(t.tmdbId),
    index("items_release_year_idx").on(t.releaseYear),
    index("items_rating_idx").on(t.rating),
    index("items_popularity_idx").on(t.popularity),
    index("items_type_idx").on(t.type),
    index("items_created_at_idx").on(t.createdAt),
  ]
);

export const insertItemSchema = createInsertSchema(itemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  featureVector: true,
});
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
