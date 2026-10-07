"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import {
  FIELD_MAX_LENGTH,
  MAX_DRAFTS_PER_USER,
  parseDraftForm,
  profileToDraftContent,
  type FieldErrors,
} from "@/lib/drafts/content";
import {
  countDrafts,
  createDraft,
  deleteDraft,
  deleteDrafts,
  getDraft,
  updateDraft,
} from "@/lib/drafts/repository";
import { GitHubAuthError, GitHubRateLimitError } from "@/lib/github/client";
import { fetchVerifiedEmails } from "@/lib/github/emails";
import { renderMarkdown } from "@/lib/github/markdown";
import { fetchCurrentProfileReadme } from "@/lib/github/profile-readme";
import { readReadmeMarker } from "@/lib/readme/marker";
import { allowRequest } from "@/lib/rate-limit";
import { fetchProfile } from "@/lib/github/profile";
import { readGitHubOrNull } from "@/lib/github/server";
import { requireSession } from "@/lib/session";

export type DraftActionResult = {
  error: "limitReached" | "github" | "database" | "notFound";
} | null;

export type SaveDraftState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "invalid"; errors: FieldErrors }
  | { status: "failed" }
  | { status: "notFound" };

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  // Postgres rejects NUL characters in text columns.
  return typeof value === "string" ? value.replaceAll("\0", "").trim() : "";
}

function logDatabaseError(action: string, error: unknown) {
  console.error(`Draft ${action} failed:`, error);
}

async function isAtDraftLimit(ownerGithubId: number): Promise<boolean> {
  return (await countDrafts(ownerGithubId)) >= MAX_DRAFTS_PER_USER;
}

async function defaultDraftTitle(): Promise<string> {
  const [t, format] = await Promise.all([getTranslations("drafts"), getFormatter()]);
  return t("defaultTitle", { date: format.dateTime(new Date(), { dateStyle: "medium" }) });
}

/** Creates a draft from the current GitHub profile, then opens it. */
export async function createDraftAction(
  _previous: DraftActionResult,
  formData: FormData,
): Promise<DraftActionResult> {
  const { user, accessToken } = await requireSession();
  const title = formString(formData, "title").slice(0, FIELD_MAX_LENGTH.title);

  try {
    if (await isAtDraftLimit(user.id)) return { error: "limitReached" };
  } catch (error) {
    logDatabaseError("count", error);
    return { error: "database" };
  }

  const [profile, currentReadme] = await Promise.all([
    readGitHubOrNull(() => fetchProfile(accessToken), "the profile"),
    // Optional: if it cannot be read, the draft simply starts from the default README.
    readGitHubOrNull(() => fetchCurrentProfileReadme(user.login, accessToken), "the profile README"),
  ]);
  if (!profile) return { error: "github" };

  let draftId: string;
  try {
    // The README starts from the published one when this app generated it
    // (it carries a settings marker); otherwise from the defaults, in the
    // language the user is browsing in.
    const base = profileToDraftContent(profile, await getLocale());
    const published = currentReadme?.status === "ready" ? readReadmeMarker(currentReadme.markdown) : null;
    const content = published ? { ...base, readme: published } : base;
    draftId = await createDraft(user.id, title || (await defaultDraftTitle()), content);
  } catch (error) {
    logDatabaseError("create", error);
    return { error: "database" };
  }

  revalidatePath("/drafts");
  redirect(`/drafts/${draftId}`);
}

export async function duplicateDraftAction(
  _previous: DraftActionResult,
  formData: FormData,
): Promise<DraftActionResult> {
  const { user } = await requireSession();
  const t = await getTranslations("drafts");

  try {
    const source = await getDraft(formString(formData, "id"), user.id);
    if (!source) return { error: "notFound" };
    if (await isAtDraftLimit(user.id)) return { error: "limitReached" };
    const title = t("copyTitle", { title: source.title }).slice(0, FIELD_MAX_LENGTH.title);
    await createDraft(user.id, title, source.content);
  } catch (error) {
    logDatabaseError("duplicate", error);
    return { error: "database" };
  }

  revalidatePath("/drafts");
  return null;
}

/**
 * Bulk actions on the drafts selected in the list. Every id is checked
 * against the signed-in owner; nothing is partially reported as success.
 */
export async function bulkDraftsAction(
  _previous: DraftActionResult,
  formData: FormData,
): Promise<DraftActionResult> {
  const { user } = await requireSession();
  const ids = [...new Set(formData.getAll("ids").filter((id): id is string => typeof id === "string"))].slice(
    0,
    MAX_DRAFTS_PER_USER,
  );
  if (ids.length === 0) return null;

  try {
    if (formData.get("intent") === "delete") {
      await deleteDrafts(ids, user.id);
    } else {
      // Duplicating must fit entirely in the quota, or nothing is created.
      if ((await countDrafts(user.id)) + ids.length > MAX_DRAFTS_PER_USER) return { error: "limitReached" };
      const t = await getTranslations("drafts");
      for (const id of ids) {
        const source = await getDraft(id, user.id);
        if (!source) continue;
        const title = t("copyTitle", { title: source.title }).slice(0, FIELD_MAX_LENGTH.title);
        await createDraft(user.id, title, source.content);
      }
    }
  } catch (error) {
    logDatabaseError("bulk", error);
    revalidatePath("/drafts"); // some items may already have changed
    return { error: "database" };
  }

  revalidatePath("/drafts");
  return null;
}

export async function deleteDraftAction(
  _previous: DraftActionResult,
  formData: FormData,
): Promise<DraftActionResult> {
  const { user } = await requireSession();

  try {
    const deleted = await deleteDraft(formString(formData, "id"), user.id);
    if (!deleted) return { error: "notFound" };
  } catch (error) {
    logDatabaseError("delete", error);
    return { error: "database" };
  }

  revalidatePath("/drafts");
  return null;
}

// Above the largest README this product generates (about 80 KB: every field
// at its limit, with five custom sections); blocks abuse of the endpoint.
const MAX_PREVIEW_BYTES = 128_000;
// The client debounces typing; this bounds anything calling the action directly.
const PREVIEW_LIMIT_PER_MINUTE = 60;

export type ReadmePreviewResult =
  | { status: "ok"; html: string }
  | { status: "error"; reason: "github" | "rateLimited" | "tooLarge" | "expired" };

/**
 * Renders README Markdown with GitHub's renderer for the editor preview.
 * The Markdown comes from generateReadme, the same function used to publish.
 * An expired token is reported (not redirected) so unsaved edits stay on screen.
 */
export async function renderReadmePreviewAction(markdown: string): Promise<ReadmePreviewResult> {
  const { user, accessToken } = await requireSession();
  if (typeof markdown !== "string" || new TextEncoder().encode(markdown).length > MAX_PREVIEW_BYTES) {
    return { status: "error", reason: "tooLarge" };
  }
  if (!allowRequest(`readme-preview:${user.id}`, PREVIEW_LIMIT_PER_MINUTE, 60_000)) {
    return { status: "error", reason: "rateLimited" };
  }

  try {
    return { status: "ok", html: await renderMarkdown(markdown, user.login, accessToken) };
  } catch (error) {
    if (error instanceof GitHubAuthError) return { status: "error", reason: "expired" };
    console.error("Rendering the README preview failed:", error);
    return { status: "error", reason: error instanceof GitHubRateLimitError ? "rateLimited" : "github" };
  }
}

/** Single entry point for the list row buttons, so they share one result state. */
export async function draftListAction(
  previous: DraftActionResult,
  formData: FormData,
): Promise<DraftActionResult> {
  return formData.get("intent") === "delete"
    ? deleteDraftAction(previous, formData)
    : duplicateDraftAction(previous, formData);
}

/** Saves the editor form. Only the draft changes; GitHub is only read, never written. */
export async function saveDraftAction(
  draftId: string,
  _previous: SaveDraftState,
  formData: FormData,
): Promise<SaveDraftState> {
  const { user, accessToken } = await requireSession();

  const parsed = parseDraftForm(formData, user.login);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };
  const { title, profile, readme } = parsed.value;

  let draft: Awaited<ReturnType<typeof getDraft>>;
  try {
    draft = await getDraft(draftId, user.id);
  } catch (error) {
    logDatabaseError("save", error);
    return { status: "failed" };
  }
  if (!draft) return { status: "notFound" };

  // A changed public email must be one of the user's verified emails.
  if (profile.email && profile.email !== draft.content.profile.email) {
    const verified = await readGitHubOrNull(() => fetchVerifiedEmails(accessToken), "verified emails");
    if (!verified) return { status: "failed" };
    const wanted = profile.email.toLowerCase();
    if (!verified.some((email) => email.toLowerCase() === wanted)) {
      return { status: "invalid", errors: { email: { code: "invalidEmail" } } };
    }
  }

  try {
    const updated = await updateDraft(draftId, user.id, {
      title,
      content: { ...draft.content, profile, readme },
    });
    // Deleted in another tab between the read and the write: never report success.
    if (!updated) return { status: "notFound" };
  } catch (error) {
    logDatabaseError("save", error);
    return { status: "failed" };
  }

  // Only the list needs fresh data: the open editor already holds what was saved,
  // and re-rendering it would repeat its GitHub reads on every save.
  revalidatePath("/drafts");
  return { status: "saved" };
}
