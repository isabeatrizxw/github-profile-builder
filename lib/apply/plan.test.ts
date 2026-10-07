import { describe, expect, it } from "vitest";
import type { DraftProfile } from "@/lib/drafts/content";
import type { GitHubProfile } from "@/lib/github/profile";
import { buildApplyPlan, partHasChanges, verifyAppliedProfile } from "./plan";

const CURRENT: GitHubProfile = {
  login: "octocat",
  name: "Mona",
  bio: null,
  location: "SP",
  company: null,
  blog: null,
  email: null,
  twitterUsername: null,
  hireable: null,
  avatarUrl: "https://a/u/1",
  htmlUrl: "https://github.com/octocat",
  socialAccounts: [{ provider: "linkedin", url: "https://linkedin.com/in/mona" }],
  profileReadme: "ready",
};

const DRAFT: DraftProfile = {
  name: "Mona",
  bio: "",
  location: "SP",
  company: "",
  blog: "",
  twitterUsername: "",
  email: "",
  hireable: false,
  socialAccounts: ["https://linkedin.com/in/mona"],
};

const SAME_README = { markdown: "# Hi\n", missingProjects: [] };

function plan(draft: Partial<DraftProfile> = {}, readme = SAME_README, current = CURRENT) {
  return buildApplyPlan({
    current,
    currentReadme: { status: "ready", path: "README.md", sha: "abc", markdown: "# Hi\n" },
    draft: { ...DRAFT, ...draft },
    readme,
  });
}

describe("buildApplyPlan", () => {
  it("finds nothing to apply when the draft matches GitHub (null equals empty / false)", () => {
    const result = plan();
    expect(partHasChanges(result, "profile")).toBe(false);
    expect(partHasChanges(result, "social")).toBe(false);
    expect(partHasChanges(result, "readme")).toBe(false);
  });

  it("lists changed profile fields with their current and new values", () => {
    const result = plan({ bio: "Backend dev", hireable: true });
    expect(result.profile.fields).toEqual([
      { field: "bio", from: "", to: "Backend dev" },
      { field: "hireable", from: false, to: true },
    ]);
    expect(result.profile.email).toBeNull();
  });

  it("tracks the public email separately", () => {
    expect(plan({ email: "mona@example.com" }).profile.email).toEqual({ from: "", to: "mona@example.com" });
  });

  it("computes social accounts to add and remove", () => {
    const result = plan({ socialAccounts: ["https://mastodon.social/@mona"] });
    expect(result.social).toEqual({
      add: ["https://mastodon.social/@mona"],
      remove: ["https://linkedin.com/in/mona"],
    });
  });

  it("replaces an existing README that differs, keeping its path and sha", () => {
    const result = plan({}, { markdown: "# New\n", missingProjects: [] });
    expect(result.readme).toMatchObject({
      action: "update",
      currentMarkdown: "# Hi\n",
      nextMarkdown: "# New\n",
      existing: { path: "README.md", sha: "abc" },
    });
  });

  it("creates the repository when there is no public profile repository", () => {
    const result = buildApplyPlan({
      current: CURRENT,
      currentReadme: { status: "no-public-repo" },
      draft: DRAFT,
      readme: SAME_README,
    });
    expect(result.readme).toMatchObject({ action: "create-repo", currentMarkdown: null, existing: null });
  });

  it("confirms only the changes a fresh read of the profile shows", () => {
    const result = plan({ bio: "Backend dev", email: "mona@example.com" });
    const after = { ...CURRENT, bio: "Backend dev", email: null };

    expect(verifyAppliedProfile(result, after)).toMatchObject({ profile: true, email: false });
  });

  it("creates only the file when the repository has no README", () => {
    const result = buildApplyPlan({ current: CURRENT, currentReadme: { status: "no-readme" }, draft: DRAFT, readme: SAME_README });
    expect(result.readme.action).toBe("create-file");
  });
});
