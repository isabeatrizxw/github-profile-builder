"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { executeApplyPlan, type StepResult } from "@/lib/apply/execute";
import { loadApplyContext, type ApplyContext } from "@/lib/apply/load";
import { APPLY_PARTS, partHasChanges, verifyAppliedProfile, type ApplyPlan } from "@/lib/apply/plan";
import { fetchProfile } from "@/lib/github/profile";
import { requireSession } from "@/lib/session";

export type ApplyState =
  | { status: "idle" }
  | { status: "done"; results: StepResult[] }
  /** GitHub or the draft changed after the review: nothing was applied. */
  | { status: "stale" }
  | { status: "nothingSelected" }
  | { status: "error"; reason: "github" | "notFound" | "database" | "readmeBlocked" | "loginChanged" };

/**
 * A 2xx from GitHub does not prove the value was stored (GitHub may ignore
 * some updates). Re-read the profile and downgrade "applied" profile steps
 * that are not visible to "unconfirmed". If the re-read fails, keep results.
 */
async function confirmProfileSteps(plan: ApplyPlan, results: StepResult[], accessToken: string) {
  const checks = ["profile", "email", "socialRemove", "socialAdd"] as const;
  if (!results.some((result) => result.status === "applied" && (checks as readonly string[]).includes(result.step))) {
    return results;
  }
  let verified: ReturnType<typeof verifyAppliedProfile>;
  try {
    verified = verifyAppliedProfile(plan, await fetchProfile(accessToken));
  } catch (error) {
    console.error("Re-reading the profile after applying failed:", error);
    return results;
  }
  return results.map((result): StepResult => {
    const step = result.step as (typeof checks)[number];
    return result.status === "applied" && checks.includes(step) && !verified[step]
      ? { step: result.step, status: "unconfirmed" }
      : result;
  });
}

/**
 * Applies the parts of a draft the user confirmed on the review page.
 * The plan is recomputed here from fresh data and must match the reviewed
 * fingerprints, so only what the user saw is ever published.
 */
export async function applyDraftAction(
  draftId: string,
  _previous: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const { user, accessToken } = await requireSession();
  const parts = APPLY_PARTS.filter((part) => formData.get(`part.${part}`) === "on");
  if (parts.length === 0) return { status: "nothingSelected" };

  let context: ApplyContext;
  try {
    context = await loadApplyContext(draftId, user, accessToken);
  } catch (error) {
    unstable_rethrow(error); // keeps the expired-session redirect working
    console.error("Loading the draft to apply failed:", error);
    return { status: "error", reason: "database" };
  }
  if (context.status !== "ok") return { status: "error", reason: context.status };
  if (parts.includes("readme") && context.readmeBlocked) return { status: "error", reason: "readmeBlocked" };

  const isStale = parts.some((part) => formData.get(`fingerprint.${part}`) !== context.fingerprints[part]);
  if (isStale) return { status: "stale" };

  const changedParts = parts.filter((part) => partHasChanges(context.plan, part));
  if (changedParts.length === 0) return { status: "nothingSelected" };

  const executed = await executeApplyPlan(context.plan, changedParts, user.login, accessToken);
  const results = await confirmProfileSteps(context.plan, executed, accessToken);

  revalidatePath("/drafts");
  revalidatePath(`/drafts/${draftId}/apply`);
  return { status: "done", results };
}
