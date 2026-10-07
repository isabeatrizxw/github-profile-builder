import "server-only";

import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { drafts } from "@/lib/db/schema";
import { normalizeDraftContent, type DraftContent } from "./content";

// Every query is scoped by owner: a draft id alone never grants access.
// The per-user draft limit is checked before inserting; it is not atomic, so
// parallel requests may slightly exceed it. That only affects the user's own
// quota, and the list is not truncated, so every draft stays visible.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DraftSummary = { id: string; title: string; updatedAt: Date };
export type Draft = DraftSummary & { content: DraftContent; createdAt: Date };

function isDraftId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

function byIdAndOwner(id: string, ownerGithubId: number) {
  return and(eq(drafts.id, id), eq(drafts.ownerGithubId, ownerGithubId));
}

export async function listDrafts(ownerGithubId: number): Promise<DraftSummary[]> {
  return getDb()
    .select({ id: drafts.id, title: drafts.title, updatedAt: drafts.updatedAt })
    .from(drafts)
    .where(eq(drafts.ownerGithubId, ownerGithubId))
    .orderBy(desc(drafts.updatedAt));
}

export async function countDrafts(ownerGithubId: number): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(drafts)
    .where(eq(drafts.ownerGithubId, ownerGithubId));
  return row?.value ?? 0;
}

export async function getDraft(id: string, ownerGithubId: number): Promise<Draft | null> {
  if (!isDraftId(id)) return null;
  const [row] = await getDb()
    .select({
      id: drafts.id,
      title: drafts.title,
      content: drafts.content,
      createdAt: drafts.createdAt,
      updatedAt: drafts.updatedAt,
    })
    .from(drafts)
    .where(byIdAndOwner(id, ownerGithubId))
    .limit(1);
  return row ? { ...row, content: normalizeDraftContent(row.content) } : null;
}

export async function createDraft(
  ownerGithubId: number,
  title: string,
  content: DraftContent,
): Promise<string> {
  const [row] = await getDb()
    .insert(drafts)
    .values({ ownerGithubId, title, content })
    .returning({ id: drafts.id });
  return row.id;
}

/** Returns false when the draft does not exist or belongs to someone else. */
export async function updateDraft(
  id: string,
  ownerGithubId: number,
  values: { title: string; content: DraftContent },
): Promise<boolean> {
  if (!isDraftId(id)) return false;
  const rows = await getDb()
    .update(drafts)
    .set({ ...values, updatedAt: new Date() })
    .where(byIdAndOwner(id, ownerGithubId))
    .returning({ id: drafts.id });
  return rows.length > 0;
}

/** Returns false when the draft does not exist or belongs to someone else. */
export async function deleteDraft(id: string, ownerGithubId: number): Promise<boolean> {
  if (!isDraftId(id)) return false;
  const rows = await getDb()
    .delete(drafts)
    .where(byIdAndOwner(id, ownerGithubId))
    .returning({ id: drafts.id });
  return rows.length > 0;
}

/** Deletes several drafts at once; ids of other owners are ignored. Returns how many were deleted. */
export async function deleteDrafts(ids: string[], ownerGithubId: number): Promise<number> {
  const valid = ids.filter(isDraftId);
  if (valid.length === 0) return 0;
  const rows = await getDb()
    .delete(drafts)
    .where(and(inArray(drafts.id, valid), eq(drafts.ownerGithubId, ownerGithubId)))
    .returning({ id: drafts.id });
  return rows.length;
}
