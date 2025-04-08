import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  votes: jsonb("votes").$type<number[]>().default([]),
  participationCount: integer("participation_count").default(0).notNull(),
  badges: jsonb("badges").$type<string[]>().default([]),
  balance: integer("balance").default(0).notNull(), // Track player's point balance
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  votes: integer("votes").default(0).notNull(),
});

export const eventVotes = pgTable("event_votes", {
  userId: integer("user_id").notNull().references(() => users.id),
  eventId: integer("event_id").notNull().references(() => events.id),
  votedAt: timestamp("voted_at").defaultNow().notNull(),
  additionalPlayers: integer("additional_players").default(0).notNull(),
  paid: boolean("paid").default(false).notNull(), // Track if player has paid for this game
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.eventId] }),
  };
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  user: text("user").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
});

export const insertEventVoteSchema = createInsertSchema(eventVotes).omit({
  votedAt: true,
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
}).extend({
  timestamp: z.date().optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type EventVote = typeof eventVotes.$inferSelect;
export type InsertEventVote = z.infer<typeof insertEventVoteSchema>;

export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

// Define extended type for vote details (to be returned to the admin)
export interface VoteDetail {
  eventId: number;
  eventTitle: string;
  userId: number;
  userName: string;
  votedAt: string | Date;
  additionalPlayers: number;
  paid: boolean;
}
