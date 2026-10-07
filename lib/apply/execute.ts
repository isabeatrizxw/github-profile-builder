import "server-only";

import { GitHubApiError, GitHubAuthError, GitHubRateLimitError } from "@/lib/github/client";
import {
  addSocialAccounts,
  removeSocialAccounts,
  updateProfileFields,
  updatePublicEmail,
  type ProfileFieldsUpdate,
} from "@/lib/github/profile-write";
import { createProfileRepository, writeProfileReadme } from "@/lib/github/profile-readme";
import type { ApplyPart, ApplyPlan, ProfileChange } from "./plan";

// Runs the confirmed parts of an apply plan against GitHub, one step at a time,
// and reports each step honestly. Nothing here runs without the user's
// explicit confirmation on the review page.

export const APPLY_STEPS = ["profile", "email", "socialRemove", "socialAdd", "repository", "readme"] as const;
export type ApplyStep = (typeof APPLY_STEPS)[number];

export type FailureReason =
  | "expired"
  | "rateLimited"
  | "permission"
  | "validation"
  | "privateRepoExists"
  /** GitHub changed since the review (e.g. the README was edited meanwhile). */
  | "conflict"
  /** No answer in time: the change may or may not have been made. */
  | "unknown"
  /** Skipped because a step it depends on failed. */
  | "notAttempted"
  | "github";

export type StepResult =
  | { step: ApplyStep; status: "applied" }
  /** GitHub accepted the request, but a fresh read does not show the change. */
  | { step: ApplyStep; status: "unconfirmed" }
  | { step: ApplyStep; status: "failed"; reason: FailureReason; detail?: string };

class PrivateRepoExistsError extends Error {}

const README_RETRY_DELAY_MS = 1500;

function toFieldsUpdate(changes: ProfileChange[]): ProfileFieldsUpdate {
  const update: Record<string, string | boolean | null> = {};
  for (const { field, to } of changes) {
    if (field === "twitterUsername") update.twitter_username = to === "" ? null : (to as string);
    else update[field] = to;
  }
  return update as ProfileFieldsUpdate;
}

function classify(error: unknown): { reason: FailureReason; detail?: string } {
  if (error instanceof PrivateRepoExistsError) return { reason: "privateRepoExists" };
  if (error instanceof GitHubAuthError) return { reason: "expired" };
  if (error instanceof GitHubRateLimitError) return { reason: "rateLimited" };
  if (error instanceof Error && error.name === "TimeoutError") return { reason: "unknown" };
  if (error instanceof GitHubApiError) {
    const { status, detail } = error;
    if (status === 409 || (status === 422 && /\bsha\b/i.test(detail ?? ""))) return { reason: "conflict" };
    // A missing OAuth scope can answer 404 on writes as well as 403.
    if (status === 403 || status === 404) return { reason: "permission", detail };
    if (status === 422) return { reason: "validation", detail };
  }
  return { reason: "github" };
}

async function createRepository(login: string, accessToken: string): Promise<void> {
  try {
    await createProfileRepository(login, accessToken);
  } catch (error) {
    // The name is taken: with the public_repo scope a private repository is
    // invisible to us, so this means a private <login>/<login> exists.
    if (error instanceof GitHubApiError && error.status === 422 && /already exists/i.test(error.detail ?? "")) {
      throw new PrivateRepoExistsError();
    }
    throw error;
  }
}

async function writeReadme(plan: ApplyPlan, login: string, accessToken: string, justCreated: boolean) {
  const write = () => writeProfileReadme(login, accessToken, plan.readme.nextMarkdown, plan.readme.existing ?? undefined);
  try {
    await write();
  } catch (error) {
    // A repository created a moment ago can briefly answer 404.
    if (!justCreated || !(error instanceof GitHubApiError) || error.status !== 404) throw error;
    await new Promise((resolve) => setTimeout(resolve, README_RETRY_DELAY_MS));
    await write();
  }
}

type Step = { step: ApplyStep; run: () => Promise<void>; dependsOn?: ApplyStep };

/** The steps the confirmed parts expand to, in the order they must run. */
function stepsFor(plan: ApplyPlan, parts: ApplyPart[], login: string, accessToken: string): Step[] {
  const steps: Step[] = [];
  if (parts.includes("profile") && plan.profile.fields.length > 0) {
    steps.push({ step: "profile", run: () => updateProfileFields(accessToken, toFieldsUpdate(plan.profile.fields)) });
  }
  if (parts.includes("profile") && plan.profile.email) {
    const email = plan.profile.email.to;
    steps.push({ step: "email", run: () => updatePublicEmail(accessToken, email) });
  }
  // Remove before adding: GitHub allows only a few social accounts at a time.
  if (parts.includes("social") && plan.social.remove.length > 0) {
    steps.push({ step: "socialRemove", run: () => removeSocialAccounts(accessToken, plan.social.remove) });
  }
  if (parts.includes("social") && plan.social.add.length > 0) {
    steps.push({
      step: "socialAdd",
      run: () => addSocialAccounts(accessToken, plan.social.add),
      dependsOn: plan.social.remove.length > 0 ? "socialRemove" : undefined,
    });
  }
  if (parts.includes("readme") && plan.readme.action === "create-repo") {
    steps.push({ step: "repository", run: () => createRepository(login, accessToken) });
  }
  if (parts.includes("readme") && plan.readme.action !== "none") {
    const justCreated = plan.readme.action === "create-repo";
    steps.push({
      step: "readme",
      run: () => writeReadme(plan, login, accessToken, justCreated),
      dependsOn: justCreated ? "repository" : undefined,
    });
  }
  return steps;
}

export async function executeApplyPlan(
  plan: ApplyPlan,
  parts: ApplyPart[],
  login: string,
  accessToken: string,
): Promise<StepResult[]> {
  const results: StepResult[] = [];
  let sessionExpired = false;

  for (const { step, run, dependsOn } of stepsFor(plan, parts, login, accessToken)) {
    // Once GitHub rejected the token, later steps would fail the same way.
    if (sessionExpired) {
      results.push({ step, status: "failed", reason: "expired" });
      continue;
    }
    if (dependsOn && results.find((result) => result.step === dependsOn)?.status !== "applied") {
      results.push({ step, status: "failed", reason: "notAttempted" });
      continue;
    }
    try {
      await run();
      results.push({ step, status: "applied" });
    } catch (error) {
      const { reason, detail } = classify(error);
      if (reason === "expired") sessionExpired = true;
      else console.error(`Applying step "${step}" failed:`, error);
      results.push({ step, status: "failed", reason, ...(detail ? { detail } : {}) });
    }
  }
  return results;
}
