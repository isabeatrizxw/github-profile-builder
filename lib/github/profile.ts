import { GitHubApiError, githubGet, isRecord } from "./client";

export type SocialAccount = {
  provider: string;
  url: string;
};

/**
 * State of the special `<login>/<login>` repository whose README is shown on
 * the profile page. With the `public_repo` scope a private repository answers
 * 404, so "no-public-repo" covers both "missing" and "private".
 */
export type ProfileReadmeStatus = "no-public-repo" | "no-readme" | "ready";

export type GitHubProfile = {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  email: string | null;
  twitterUsername: string | null;
  /** `null` when the user never set it on GitHub. */
  hireable: boolean | null;
  avatarUrl: string;
  htmlUrl: string;
  socialAccounts: SocialAccount[];
  profileReadme: ProfileReadmeStatus;
};

// GitHub returns "" for some cleared fields; treat it like "not set".
function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function parseSocialAccounts(data: unknown): SocialAccount[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) =>
    isRecord(item) && typeof item.provider === "string" && typeof item.url === "string"
      ? [{ provider: item.provider, url: item.url }]
      : [],
  );
}

async function fetchProfileReadmeStatus(
  login: string,
  accessToken: string,
): Promise<ProfileReadmeStatus> {
  const repoPath = `/repos/${encodeURIComponent(login)}/${encodeURIComponent(login)}`;

  const repo = await githubGet(repoPath, accessToken);
  if (repo === null || (isRecord(repo) && repo.private === true)) return "no-public-repo";

  const readme = await githubGet(`${repoPath}/readme`, accessToken);
  return readme === null ? "no-readme" : "ready";
}

/** Reads the authenticated user's current profile, as GitHub has it now. */
export async function fetchProfile(accessToken: string): Promise<GitHubProfile> {
  const user = await githubGet("/user", accessToken);
  if (
    !isRecord(user) ||
    typeof user.login !== "string" ||
    typeof user.avatar_url !== "string" ||
    typeof user.html_url !== "string"
  ) {
    throw new GitHubApiError("Unexpected response shape from GET /user", 200);
  }

  const [socialAccounts, profileReadme] = await Promise.all([
    githubGet("/user/social_accounts", accessToken).then(parseSocialAccounts),
    fetchProfileReadmeStatus(user.login, accessToken),
  ]);

  return {
    login: user.login,
    name: optionalString(user.name),
    bio: optionalString(user.bio),
    location: optionalString(user.location),
    company: optionalString(user.company),
    blog: optionalString(user.blog),
    email: optionalString(user.email),
    twitterUsername: optionalString(user.twitter_username),
    hireable: typeof user.hireable === "boolean" ? user.hireable : null,
    avatarUrl: user.avatar_url,
    htmlUrl: user.html_url,
    socialAccounts,
    profileReadme,
  };
}
