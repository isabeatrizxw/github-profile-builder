// GitHub OAuth App flow: authorize URL, code -> token exchange and the
// authenticated user lookup. Secrets are passed in by the caller (server only).

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";

// `user` (read/write profile, includes read:user and user:email) and
// `public_repo` (write the profile README repository) are required to apply
// changes later; they are requested at sign-in by product decision.
export const GITHUB_OAUTH_SCOPES = ["user", "public_repo"] as const;

const OAUTH_CALLBACK_PATH = "/api/auth/callback";
const REQUEST_TIMEOUT_MS = 10_000;

export const OAUTH_STATE_COOKIE = "gpb_oauth_state";

export type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string;
};

export class GitHubOAuthError extends Error {
  name = "GitHubOAuthError";
}

// Built from the configured app URL (not the request Host header) so the
// login and callback always send GitHub the exact registered callback URL.
export function buildRedirectUri(appUrl: string): string {
  return new URL(OAUTH_CALLBACK_PATH, appUrl).toString();
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", GITHUB_OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeCodeForToken(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new GitHubOAuthError(`Token exchange failed with HTTP ${response.status}`);
  }

  // GitHub answers 200 even for failures, with an `error` field instead of a token.
  const data: unknown = await response.json();
  const token = isRecord(data) ? data.access_token : undefined;
  if (typeof token !== "string" || token.length === 0) {
    const reason = isRecord(data) && typeof data.error === "string" ? data.error : "no access token";
    throw new GitHubOAuthError(`Token exchange failed: ${reason}`);
  }
  return token;
}

export async function fetchAuthenticatedUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(USER_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new GitHubOAuthError(`Fetching the authenticated user failed with HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (
    !isRecord(data) ||
    typeof data.id !== "number" ||
    typeof data.login !== "string" ||
    typeof data.avatar_url !== "string"
  ) {
    throw new GitHubOAuthError("Unexpected response shape from GET /user");
  }

  return {
    id: data.id,
    login: data.login,
    name: typeof data.name === "string" ? data.name : null,
    avatarUrl: data.avatar_url,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
