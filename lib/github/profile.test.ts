import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProfile } from "./profile";
import { mockGitHub } from "./test-utils";

const USER = {
  login: "octocat",
  name: "Mona Lisa",
  bio: "Building things",
  location: "",
  company: null,
  blog: "example.com",
  email: null,
  twitter_username: "monalisa",
  hireable: true,
  avatar_url: "https://avatars.githubusercontent.com/u/1",
  html_url: "https://github.com/octocat",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchProfile", () => {
  it("maps the profile and treats empty strings as not set", async () => {
    mockGitHub([
      ["/user/social_accounts", { body: [{ provider: "linkedin", url: "https://linkedin.com/in/mona" }] }],
      ["/repos/octocat/octocat/readme", { body: { name: "README.md" } }],
      ["/repos/octocat/octocat", { body: { private: false } }],
      ["/user", { body: USER }],
    ]);

    await expect(fetchProfile("gho_test")).resolves.toEqual({
      login: "octocat",
      name: "Mona Lisa",
      bio: "Building things",
      location: null,
      company: null,
      blog: "example.com",
      email: null,
      twitterUsername: "monalisa",
      hireable: true,
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
      htmlUrl: "https://github.com/octocat",
      socialAccounts: [{ provider: "linkedin", url: "https://linkedin.com/in/mona" }],
      profileReadme: "ready",
    });
  });

  it("reports no public profile repository when GitHub answers 404", async () => {
    mockGitHub([
      ["/user/social_accounts", { body: [] }],
      ["/repos/octocat/octocat", { status: 404 }],
      ["/user", { body: USER }],
    ]);

    await expect(fetchProfile("gho_test")).resolves.toMatchObject({ profileReadme: "no-public-repo" });
  });

  it("keeps hireable as null when it was never set", async () => {
    mockGitHub([
      ["/user/social_accounts", { body: [] }],
      ["/repos/octocat/octocat", { status: 404 }],
      ["/user", { body: { ...USER, hireable: null } }],
    ]);

    await expect(fetchProfile("gho_test")).resolves.toMatchObject({ hireable: null });
  });

  it("reports a profile repository without README", async () => {
    mockGitHub([
      ["/user/social_accounts", { body: [] }],
      ["/repos/octocat/octocat/readme", { status: 404 }],
      ["/repos/octocat/octocat", { body: { private: false } }],
      ["/user", { body: USER }],
    ]);

    await expect(fetchProfile("gho_test")).resolves.toMatchObject({ profileReadme: "no-readme" });
  });

  it("rejects an unexpected /user response", async () => {
    mockGitHub([["/user", { body: { login: "octocat" } }]]);

    await expect(fetchProfile("gho_test")).rejects.toThrow("Unexpected response shape");
  });
});
