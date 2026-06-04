import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const threadStatusEnum = pgEnum("thread_status", [
  "pending",
  "matched",
  "closed",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    hashedDisplayId: text("hashed_display_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    optInResponder: boolean("opt_in_responder").default(false).notNull(),
    topicTags: text("topic_tags")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_hashed_display_id_unique").on(table.hashedDisplayId),
  ],
);

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    status: threadStatusEnum("status").default("pending").notNull(),
    writerId: uuid("writer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    responderId: uuid("responder_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    topicTags: text("topic_tags")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
  },
  (table) => [
    index("threads_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    flagged: boolean("flagged").default(false).notNull(),
  },
  (table) => [
    index("messages_thread_id_created_at_idx").on(
      table.threadId,
      table.createdAt,
    ),
  ],
);
