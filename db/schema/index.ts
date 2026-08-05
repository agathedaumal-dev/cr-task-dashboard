import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Users table — mirrors Clerk users. Populated on first ticket creation.
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tickets table — linked to users via a foreign key.
// Demonstrates: insert, FK relationship, and JOIN queries.
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- CR Task Dashboard tables (added for the Meeting CR -> Task pipeline) ---

import { pgEnum, uuid, boolean } from "drizzle-orm/pg-core";

export const productIdEnum = pgEnum("product_id", [
  "carbon-comp-fr",
  "carbon-comp-sp",
  "carbon-comp-it",
  "mrh",
  "other",
]);

export const priorityEnum = pgEnum("priority", ["High", "Medium", "Low"]);

export const statusEnum = pgEnum("status", [
  "To Do",
  "In Progress",
  "Blocked",
  "Done",
]);

// How a task relates to the interlocutor it's linked to.
// - 'my-todo'            : plain personal task, not tied to an interlocutor follow-up
// - 'i-owe-them'         : Agathe owes this interlocutor an action
// - 'we-follow-together' : joint follow-up point tracked with this interlocutor
export const taskTypeEnum = pgEnum("task_type", [
  "my-todo",
  "i-owe-them",
  "they-owe-me",
  "we-follow-together",
]);

export const languageEnum = pgEnum("language", ["en", "fr", "es"]);

export const crSourceEnum = pgEnum("cr_source", [
  "manual-paste",
  "granola-webhook",
]);

export const interlocutors = pgTable("interlocutors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  whatTheyDo: text("what_they_do").notNull().default(""),
  // Fallback product tag used when keyword inference on a CR is inconclusive.
  defaultProductId: productIdEnum("default_product_id"),
  // Optional shared-page grouping (e.g. "CRM", "Data", "Customer Care MRH").
  // Interlocutors with the same team share one Interlocutor Hub page; each
  // task is still attributed to the real individual (interlocutorId is
  // unchanged) and the UI prefixes the task title with that person's name.
  team: text("team"),
  // True for interlocutors seeded manually; false for ones auto-created
  // when a new name shows up in a CR (per the "prompt for new names" flow).
  isConfirmed: boolean("is_confirmed").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const meetingCrs = pgTable("meeting_crs", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  meetingDate: timestamp("meeting_date").notNull(),
  attendees: text("attendees").array().notNull().default([]),
  language: languageEnum("language").notNull(),
  rawText: text("raw_text").notNull(),
  source: crSourceEnum("source").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("cr_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  // 'Me' or an interlocutors.id (stored as text to keep the union simple at the DB layer).
  assignee: text("assignee").notNull(),
  interlocutorId: uuid("interlocutor_id").references(() => interlocutors.id),
  productId: productIdEnum("product_id").notNull(),
  // Nullable due date renders as "TBD" in the UI with inline edit.
  dueDate: timestamp("due_date"),
  priority: priorityEnum("priority").notNull().default("Medium"),
  status: statusEnum("status").notNull().default("To Do"),
  type: taskTypeEnum("type").notNull().default("my-todo"),
  // Delegation: task stays exactly where it is (assignee/interlocutorId/type
  // unchanged) but also shows up on this interlocutor's page, greyed out with
  // their name tagged, so the original owner (e.g. Agathe, as manager) keeps
  // following it while the delegate also sees it as their own.
  delegatedTo: uuid("delegated_to").references(() => interlocutors.id),
  crId: uuid("cr_id").references(() => meetingCrs.id),
  crSourceTitle: text("cr_source_title").notNull(),
  crDate: timestamp("cr_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Single global scratchpad note — deliberately NOT tied to any task, so
// jotting a thought down never touches task/progress data. Always exactly one
// row (the app upserts row id 'global' on save).
export const scratchNotes = pgTable("scratch_notes", {
  id: text("id").primaryKey(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
