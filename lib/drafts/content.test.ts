import { describe, expect, it } from "vitest";
import type { GitHubProfile } from "@/lib/github/profile";
import { defaultReadme } from "@/lib/readme/config";
import { normalizeDraftContent, parseDraftForm, profileToDraftContent, type DraftContent } from "./content";

const PROFILE: GitHubProfile = {
  login: "octocat",
  name: "Mona Lisa",
  bio: null,
  location: "São Paulo",
  company: null,
  blog: "example.com",
  email: null,
  twitterUsername: null,
  hireable: null,
  avatarUrl: "https://avatars.githubusercontent.com/u/1",
  htmlUrl: "https://github.com/octocat",
  socialAccounts: [{ provider: "linkedin", url: "https://linkedin.com/in/mona" }],
  profileReadme: "ready",
};

// Every form carries the required README choices unless a test overrides them.
function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  fields = { "readme.template": "classic", "readme.language": "pt-BR", ...fields };
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

describe("profileToDraftContent", () => {
  it("starts the draft from the real profile, with empty strings for unset fields", () => {
    expect(profileToDraftContent(PROFILE, "en")).toEqual({
      version: 1,
      profile: {
        name: "Mona Lisa",
        bio: "",
        location: "São Paulo",
        company: "",
        blog: "example.com",
        twitterUsername: "",
        email: "",
        hireable: false,
        socialAccounts: ["https://linkedin.com/in/mona"],
      },
      readme: defaultReadme("en"),
    });
  });
});

describe("normalizeDraftContent", () => {
  it("fills fields added after the draft was saved", () => {
    const stored = { version: 1, profile: { name: "Mona" } } as unknown as DraftContent;

    expect(normalizeDraftContent(stored).profile).toMatchObject({ name: "Mona", email: "", socialAccounts: [] });
  });

  it("resets wrongly typed values and drops unknown fields", () => {
    const stored = {
      version: 1,
      profile: { name: 42, email: null, socialAccounts: ["https://a.dev", 7], extra: "x" },
    } as unknown as DraftContent;

    const { profile } = normalizeDraftContent(stored);
    expect(profile).toMatchObject({ name: "", email: "", socialAccounts: ["https://a.dev"] });
    expect(profile).not.toHaveProperty("extra");
  });
});

describe("parseDraftForm", () => {
  it("accepts a valid form and trims values", () => {
    const result = parseDraftForm(
      form({
        title: "  My draft ",
        name: " Mona ",
        bio: "Hi",
        twitterUsername: "@mona_lisa",
        hireable: "on",
        socialAccounts: ["https://linkedin.com/in/mona", "", "  "],
      }),
      "octocat",
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        title: "My draft",
        profile: {
          name: "Mona",
          bio: "Hi",
          location: "",
          company: "",
          blog: "",
          twitterUsername: "mona_lisa",
          email: "",
          hireable: true,
          socialAccounts: ["https://linkedin.com/in/mona"],
        },
      },
    });
  });

  it("strips NUL characters, which Postgres rejects", () => {
    const result = parseDraftForm(form({ title: "a\u0000b", name: "Mo\u0000na" }), "octocat");
    expect(result).toMatchObject({ ok: true, value: { title: "ab", profile: { name: "Mona" } } });
  });

  it("counts a textarea line break (\\r\\n) as one character", () => {
    const bio = `${"a".repeat(79)}\r\n${"b".repeat(80)}`;
    const result = parseDraftForm(form({ title: "x", bio }), "octocat");
    expect(result).toMatchObject({ ok: true, value: { profile: { bio: `${"a".repeat(79)}\n${"b".repeat(80)}` } } });
  });

  it("requires a title", () => {
    expect(parseDraftForm(form({ title: "   " }), "octocat")).toEqual({
      ok: false,
      errors: { title: { code: "required" } },
    });
  });

  it("enforces the GitHub bio limit", () => {
    const result = parseDraftForm(form({ title: "x", bio: "a".repeat(161) }), "octocat");
    expect(result).toEqual({ ok: false, errors: { bio: { code: "tooLong", max: 160 } } });
  });

  it("rejects invalid X usernames", () => {
    const result = parseDraftForm(form({ title: "x", twitterUsername: "not valid!" }), "octocat");
    expect(result).toMatchObject({ ok: false, errors: { twitterUsername: { code: "invalidUsername" } } });
  });

  it("rejects a malformed email", () => {
    const result = parseDraftForm(form({ title: "x", email: "not-an-email" }), "octocat");
    expect(result).toMatchObject({ ok: false, errors: { email: { code: "invalidEmail" } } });
  });

  it("rejects non-http social links", () => {
    const result = parseDraftForm(form({ title: "x", socialAccounts: ["javascript:alert(1)"] }), "octocat");
    expect(result).toMatchObject({ ok: false, errors: { socialAccounts: { code: "invalidUrl" } } });
  });

  it("rejects more than four social links", () => {
    const urls = Array.from({ length: 5 }, (_, index) => `https://example.com/${index}`);
    const result = parseDraftForm(form({ title: "x", socialAccounts: urls }), "octocat");
    expect(result).toMatchObject({ ok: false, errors: { socialAccounts: { code: "tooMany", max: 4 } } });
  });
});
