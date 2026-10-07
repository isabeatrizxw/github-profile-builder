import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GitHubApiError,
  GitHubAuthError,
  GitHubRateLimitError,
  githubGet,
  githubGraphQL,
} from "./client";
import { mockGitHub } from "./test-utils";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("githubGet", () => {
  it("returns parsed JSON and sends the bearer token", async () => {
    const fetchMock = mockGitHub([["/user", { body: { login: "octocat" } }]]);

    await expect(githubGet("/user", "gho_test")).resolves.toEqual({ login: "octocat" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.github.com/user");
  });

  it("returns null on 404", async () => {
    mockGitHub([["/repos", { status: 404 }]]);

    await expect(githubGet("/repos/a/a", "gho_test")).resolves.toBeNull();
  });

  it("throws GitHubAuthError on 401", async () => {
    mockGitHub([["/user", { status: 401 }]]);

    await expect(githubGet("/user", "gho_test")).rejects.toBeInstanceOf(GitHubAuthError);
  });

  it("throws GitHubRateLimitError on 403 without remaining quota", async () => {
    mockGitHub([["/user", { status: 403, headers: { "x-ratelimit-remaining": "0" } }]]);

    await expect(githubGet("/user", "gho_test")).rejects.toBeInstanceOf(GitHubRateLimitError);
  });

  it("throws GitHubRateLimitError on a secondary rate limit (403 + retry-after)", async () => {
    mockGitHub([["/user", { status: 403, headers: { "retry-after": "60" } }]]);

    await expect(githubGet("/user", "gho_test")).rejects.toBeInstanceOf(GitHubRateLimitError);
  });

  it("throws GitHubRateLimitError on 429", async () => {
    mockGitHub([["/user", { status: 429 }]]);

    await expect(githubGet("/user", "gho_test")).rejects.toBeInstanceOf(GitHubRateLimitError);
  });

  it("throws a plain GitHubApiError on other failures", async () => {
    mockGitHub([["/user", { status: 500 }]]);

    const error = await githubGet("/user", "gho_test").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GitHubApiError);
    expect(error).not.toBeInstanceOf(GitHubAuthError);
    expect((error as GitHubApiError).status).toBe(500);
  });
});

describe("githubGraphQL", () => {
  it("returns data", async () => {
    mockGitHub([["/graphql", { body: { data: { viewer: { login: "octocat" } } } }]]);

    await expect(githubGraphQL("query { viewer { login } }", {}, "gho_test")).resolves.toEqual({
      viewer: { login: "octocat" },
    });
  });

  it("throws GitHubRateLimitError on a RATE_LIMITED GraphQL error", async () => {
    mockGitHub([["/graphql", { body: { errors: [{ type: "RATE_LIMITED", message: "limit" }] } }]]);

    await expect(githubGraphQL("query { x }", {}, "gho_test")).rejects.toBeInstanceOf(
      GitHubRateLimitError,
    );
  });

  it("throws on GraphQL errors even with HTTP 200", async () => {
    mockGitHub([["/graphql", { body: { errors: [{ message: "Something broke" }] } }]]);

    await expect(githubGraphQL("query { x }", {}, "gho_test")).rejects.toThrow(
      "GraphQL error: Something broke",
    );
  });
});
