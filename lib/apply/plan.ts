import type { DraftProfile } from "@/lib/drafts/content";
import type { CurrentProfileReadme } from "@/lib/github/profile-readme";
import type { GitHubProfile } from "@/lib/github/profile";
import type { ReadmeOutput } from "@/lib/readme/generate";

// What applying a draft would change on GitHub, computed from the current
// GitHub state and the saved draft. Pure: the review page shows it, and the
// apply step recomputes it and checks it still matches what was reviewed.

export const APPLY_PARTS = ["profile", "social", "readme"] as const;
export type ApplyPart = (typeof APPLY_PARTS)[number];

export const PROFILE_FIELDS = ["name", "bio", "location", "company", "blog", "twitterUsername", "hireable"] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export type ProfileChange = { field: ProfileField; from: string | boolean; to: string | boolean };

export type ReadmeAction =
  | "none"
  /** Create the public <login>/<login> repository, then the README. */
  | "create-repo"
  /** Repository exists without a README. */
  | "create-file"
  /** Replace the existing README. */
  | "update";

export type ApplyPlan = {
  profile: { fields: ProfileChange[]; email: { from: string; to: string } | null };
  social: { add: string[]; remove: string[] };
  readme: {
    action: ReadmeAction;
    currentMarkdown: string | null;
    nextMarkdown: string;
    missingProjects: string[];
    /** Needed to replace an existing file. */
    existing: { path: string; sha: string } | null;
  };
};

function currentValue(profile: GitHubProfile, field: ProfileField): string | boolean {
  // GitHub's null means "not set": the same as an empty field or "not hireable".
  return field === "hireable" ? profile.hireable === true : (profile[field] ?? "");
}

function planReadme(current: CurrentProfileReadme, output: ReadmeOutput): ApplyPlan["readme"] {
  const base = { nextMarkdown: output.markdown, missingProjects: output.missingProjects };
  switch (current.status) {
    case "no-public-repo":
      return { ...base, action: "create-repo", currentMarkdown: null, existing: null };
    case "no-readme":
      return { ...base, action: "create-file", currentMarkdown: null, existing: null };
    case "ready": {
      const unchanged = current.markdown === output.markdown;
      return {
        ...base,
        action: unchanged ? "none" : "update",
        currentMarkdown: current.markdown,
        existing: { path: current.path, sha: current.sha },
      };
    }
  }
}

export function buildApplyPlan(input: {
  current: GitHubProfile;
  currentReadme: CurrentProfileReadme;
  draft: DraftProfile;
  readme: ReadmeOutput;
}): ApplyPlan {
  const { current, draft } = input;
  const fields = PROFILE_FIELDS.flatMap((field) => {
    const from = currentValue(current, field);
    const to = draft[field];
    return from === to ? [] : [{ field, from, to }];
  });
  const currentEmail = current.email ?? "";
  const currentSocial = current.socialAccounts.map((account) => account.url);

  return {
    profile: {
      fields,
      email: currentEmail === draft.email ? null : { from: currentEmail, to: draft.email },
    },
    social: {
      add: draft.socialAccounts.filter((url) => !currentSocial.includes(url)),
      remove: currentSocial.filter((url) => !draft.socialAccounts.includes(url)),
    },
    readme: planReadme(input.currentReadme, input.readme),
  };
}

export function partHasChanges(plan: ApplyPlan, part: ApplyPart): boolean {
  switch (part) {
    case "profile":
      return plan.profile.fields.length > 0 || plan.profile.email !== null;
    case "social":
      return plan.social.add.length > 0 || plan.social.remove.length > 0;
    case "readme":
      return plan.readme.action !== "none";
  }
}

/** The data that defines what a part would publish, for fingerprinting. */
export function partSnapshot(plan: ApplyPlan, part: ApplyPart): unknown {
  return part === "readme"
    ? {
        action: plan.readme.action,
        current: plan.readme.currentMarkdown,
        next: plan.readme.nextMarkdown,
        path: plan.readme.existing?.path ?? null,
        missingProjects: plan.readme.missingProjects,
      }
    : plan[part];
}

/**
 * Which planned changes are now visible on GitHub, from a fresh read after
 * applying. A 2xx answer alone does not prove GitHub stored a value.
 */
export function verifyAppliedProfile(plan: ApplyPlan, after: GitHubProfile) {
  const urls = after.socialAccounts.map((account) => account.url);
  return {
    profile: plan.profile.fields.every(({ field, to }) => currentValue(after, field) === to),
    email: plan.profile.email === null || (after.email ?? "") === plan.profile.email.to,
    socialRemove: plan.social.remove.every((url) => !urls.includes(url)),
    socialAdd: plan.social.add.every((url) => urls.includes(url)),
  };
}
