import { bigint, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { DraftContent } from "@/lib/drafts/content";

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // GitHub's numeric user id: stable even if the user renames their login.
    ownerGithubId: bigint("owner_github_id", { mode: "number" }).notNull(),
    title: text("title").notNull(),
    content: jsonb("content").$type<DraftContent>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("drafts_owner_updated_idx").on(table.ownerGithubId, table.updatedAt)],
);
