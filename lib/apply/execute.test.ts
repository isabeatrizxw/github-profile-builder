import { afterEach, describe, expect, it, vi } from "vitest";
import { mockGitHub } from "@/lib/github/test-utils";
import { executeApplyPlan } from "./execute";
import type { ApplyPlan } from "./plan";

const PLAN: ApplyPlan = {
  profile: {
    fields: [
      { field: "bio", from: "", to: "Backend dev" },
      { field: "twitterUsername", from: "old", to: "" },
    ],
    email: { from: "", to: "mona@example.com" },
  },
  social: { add: ["https://mastodon.social/@mona"], remove: ["https://linkedin.com/in/mona"] },
  readme: {
    action: "update",
    currentMarkdown: "# Old\n",
    nextMarkdown: "# New\n",
    missingProjects: [],
    existing: { path: "README.md", sha: "abc" },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function requests(fetchMock: ReturnType<typeof mockGitHub>) {
  return fetchMock.mock.calls.map(([url, init]) => ({
    method: (init as RequestInit).method,
    url: String(url).replace("https://api.github.com", ""),
    body: JSON.parse(String((init as RequestInit).body)),
  }));
}

describe("executeApplyPlan", () => {
  it("applies the selected parts in order and reports each step", async () => {
    const fetchMock = mockGitHub([
      ["/user/social_accounts", { status: 201, body: [] }],
      ["/contents/README.md", { body: { content: {} } }],
      ["/user", { body: {} }],
    ]);

    const results = await executeApplyPlan(PLAN, ["profile", "social", "readme"], "octocat", "gho_test");

    expect(results).toEqual([
      { step: "profile", status: "applied" },
      { step: "email", status: "applied" },
      { step: "socialRemove", status: "applied" },
      { step: "socialAdd", status: "applied" },
      { step: "readme", status: "applied" },
    ]);
    const sent = requests(fetchMock);
    expect(sent[0]).toEqual({ method: "PATCH", url: "/user", body: { bio: "Backend dev", twitter_username: null } });
    expect(sent[1]).toEqual({ method: "PATCH", url: "/user", body: { email: "mona@example.com" } });
    expect(sent[2]).toMatchObject({ method: "DELETE", url: "/user/social_accounts" });
    expect(sent[3]).toMatchObject({ method: "POST", url: "/user/social_accounts" });
    expect(sent[4]).toMatchObject({
      method: "PUT",
      url: "/repos/octocat/octocat/contents/README.md",
      body: { sha: "abc", content: Buffer.from("# New\n").toString("base64") },
    });
  });

  it("only runs the parts the user selected", async () => {
    const fetchMock = mockGitHub([["/contents/README.md", { body: {} }]]);

    const results = await executeApplyPlan(PLAN, ["readme"], "octocat", "gho_test");

    expect(results).toEqual([{ step: "readme", status: "applied" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a rejected email without blocking the other fields, with GitHub's message", async () => {
    const fetchMock = mockGitHub([["/user", { body: {} }]]);
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Validation Failed", errors: ["email is not verified"] }), {
          status: 422,
        }),
      );

    const results = await executeApplyPlan(PLAN, ["profile"], "octocat", "gho_test");

    expect(results).toEqual([
      { step: "profile", status: "applied" },
      { step: "email", status: "failed", reason: "validation", detail: "Validation Failed — email is not verified" },
    ]);
  });

  it("never reports success after the token is rejected", async () => {
    mockGitHub([["/", { status: 401 }]]);

    const results = await executeApplyPlan(PLAN, ["profile", "social", "readme"], "octocat", "gho_test");

    expect(results.every((result) => result.status === "failed" && result.reason === "expired")).toBe(true);
    expect(results).toHaveLength(5);
  });

  it("explains when a private profile repository blocks creating the public one", async () => {
    mockGitHub([["/user/repos", { status: 422, body: { message: "Repository creation failed.", errors: [{ message: "name already exists on this account" }] } }]]);
    const plan: ApplyPlan = { ...PLAN, readme: { ...PLAN.readme, action: "create-repo", existing: null, currentMarkdown: null } };

    const results = await executeApplyPlan(plan, ["readme"], "octocat", "gho_test");

    expect(results).toEqual([
      { step: "repository", status: "failed", reason: "privateRepoExists" },
      { step: "readme", status: "failed", reason: "notAttempted" },
    ]);
  });

  it("reports social removals that happened even when adding fails afterwards", async () => {
    const fetchMock = mockGitHub([["/user/social_accounts", { status: 204, body: "" }]]);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Validation Failed" }), { status: 422 }));

    const results = await executeApplyPlan(PLAN, ["social"], "octocat", "gho_test");

    expect(results).toEqual([
      { step: "socialRemove", status: "applied" },
      { step: "socialAdd", status: "failed", reason: "validation", detail: "Validation Failed" },
    ]);
  });

  it("reports a README edited on GitHub after the review as a conflict", async () => {
    mockGitHub([["/contents/README.md", { status: 409, body: { message: "README.md does not match abc" } }]]);

    const results = await executeApplyPlan(PLAN, ["readme"], "octocat", "gho_test");

    expect(results).toEqual([{ step: "readme", status: "failed", reason: "conflict" }]);
  });
});
