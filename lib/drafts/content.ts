import type { GitHubProfile } from "@/lib/github/profile";
import {
  defaultReadme,
  normalizeReadme,
  parseReadmeForm,
  type DraftReadme,
  type ReadmeFieldError,
  type ReadmeFieldName,
  type ReadmeLanguage,
} from "@/lib/readme/config";

// What a draft stores. Only fields that the GitHub API can actually change
// (PATCH /user and /user/social_accounts) belong in `profile`.
export type DraftProfile = {
  name: string;
  bio: string;
  location: string;
  company: string;
  blog: string;
  twitterUsername: string;
  /** Public email; must be one of the user's verified emails. "" = not shown. */
  email: string;
  hireable: boolean;
  socialAccounts: string[];
};

export type DraftContent = {
  version: 1;
  profile: DraftProfile;
  readme: DraftReadme;
};

// Limits enforced by GitHub's profile settings.
export const FIELD_MAX_LENGTH = {
  title: 100,
  name: 255,
  bio: 160,
  location: 255,
  company: 255,
  blog: 255,
  twitterUsername: 15,
  email: 255,
  socialAccount: 255,
} as const;
export const MAX_SOCIAL_ACCOUNTS = 4;
export const MAX_DRAFTS_PER_USER = 50;

export function profileToDraftContent(profile: GitHubProfile, readmeLanguage: ReadmeLanguage): DraftContent {
  return {
    version: 1,
    readme: defaultReadme(readmeLanguage),
    profile: {
      name: profile.name ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      company: profile.company ?? "",
      blog: profile.blog ?? "",
      twitterUsername: profile.twitterUsername ?? "",
      email: profile.email ?? "",
      hireable: profile.hireable ?? false,
      socialAccounts: profile.socialAccounts.map((account) => account.url).slice(0, MAX_SOCIAL_ACCOUNTS),
    },
  };
}

const EMPTY_PROFILE: DraftProfile = {
  name: "",
  bio: "",
  location: "",
  company: "",
  blog: "",
  twitterUsername: "",
  email: "",
  hireable: false,
  socialAccounts: [],
};

/**
 * Rebuilds the stored jsonb with known fields only: fields added after a draft
 * was saved (e.g. `email`) get defaults and wrongly typed values are reset, so
 * older rows keep working without a data migration.
 */
export function normalizeDraftContent(raw: DraftContent): DraftContent {
  const stored: Record<string, unknown> =
    typeof raw?.profile === "object" && raw.profile !== null ? raw.profile : {};
  const str = (key: keyof DraftProfile) =>
    typeof stored[key] === "string" ? (stored[key] as string) : (EMPTY_PROFILE[key] as string);

  return {
    ...raw,
    version: 1,
    profile: {
      name: str("name"),
      bio: str("bio"),
      location: str("location"),
      company: str("company"),
      blog: str("blog"),
      twitterUsername: str("twitterUsername"),
      email: str("email"),
      hireable: stored.hireable === true,
      socialAccounts: Array.isArray(stored.socialAccounts)
        ? stored.socialAccounts.filter((url): url is string => typeof url === "string")
        : [],
    },
    readme: normalizeReadme(raw?.readme),
  };
}

// README errors share the same map, keyed "readme.<field>".
export type DraftFieldName =
  | keyof typeof FIELD_MAX_LENGTH
  | "socialAccounts"
  | `readme.${ReadmeFieldName}`;
export type FieldError =
  | { code: "required" }
  | { code: "tooLong"; max: number }
  | { code: "invalidUrl" }
  | { code: "invalidUsername" }
  | { code: "invalidEmail" }
  | { code: "tooMany"; max: number }
  | ReadmeFieldError;
export type FieldErrors = Partial<Record<DraftFieldName, FieldError>>;

export type DraftFormResult =
  | { ok: true; value: { title: string; profile: DraftProfile; readme: DraftReadme } }
  | { ok: false; errors: FieldErrors };

// Postgres rejects NUL characters in text and jsonb, so strip them here.
// FormData sends textarea line breaks as \r\n; count them as one character,
// like the browser's maxLength does. The editor preview applies the same
// normalization so it shows exactly what will be saved and published.
export function cleanText(value: string): string {
  return value.replaceAll("\0", "").replaceAll("\r\n", "\n").trim();
}

function clean(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? cleanText(value) : "";
}

function text(formData: FormData, name: string): string {
  return clean(formData.get(name));
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates the draft editor form. Never trusts the client.
 * `login` is the signed-in user: README projects must be their repositories.
 */
export function parseDraftForm(formData: FormData, login: string): DraftFormResult {
  const errors: FieldErrors = {};
  const checkLength = (field: keyof typeof FIELD_MAX_LENGTH, value: string) => {
    const max = FIELD_MAX_LENGTH[field];
    if (value.length > max) errors[field] = { code: "tooLong", max };
  };

  const title = text(formData, "title");
  if (!title) errors.title = { code: "required" };
  checkLength("title", title);

  const profile: DraftProfile = {
    name: text(formData, "name"),
    bio: text(formData, "bio"),
    location: text(formData, "location"),
    company: text(formData, "company"),
    blog: text(formData, "blog"),
    twitterUsername: text(formData, "twitterUsername").replace(/^@/, ""),
    email: text(formData, "email"),
    hireable: formData.get("hireable") === "on",
    socialAccounts: formData
      .getAll("socialAccounts")
      .map(clean)
      .filter((value) => value !== ""),
  };

  for (const field of ["name", "bio", "location", "company", "blog", "twitterUsername"] as const) {
    checkLength(field, profile[field]);
  }
  if (profile.twitterUsername && !/^[A-Za-z0-9_]{1,15}$/.test(profile.twitterUsername)) {
    errors.twitterUsername = { code: "invalidUsername" };
  }
  // Shape only; the server action also checks it is one of the verified emails.
  if (
    profile.email &&
    (profile.email.length > FIELD_MAX_LENGTH.email || !/^[^\s@]+@[^\s@]+$/.test(profile.email))
  ) {
    errors.email = { code: "invalidEmail" };
  }
  if (profile.socialAccounts.length > MAX_SOCIAL_ACCOUNTS) {
    errors.socialAccounts = { code: "tooMany", max: MAX_SOCIAL_ACCOUNTS };
  } else if (
    profile.socialAccounts.some(
      (url) => url.length > FIELD_MAX_LENGTH.socialAccount || !isHttpUrl(url),
    )
  ) {
    errors.socialAccounts = { code: "invalidUrl" };
  }

  const readme = parseReadmeForm(formData, clean, login);
  for (const [field, error] of Object.entries(readme.errors)) {
    errors[`readme.${field as ReadmeFieldName}`] = error;
  }

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, value: { title, profile, readme: readme.value } };
}
