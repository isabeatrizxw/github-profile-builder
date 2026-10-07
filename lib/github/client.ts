// Minimal GitHub API client: REST GET + GraphQL, with typed errors so the UI
// can tell an expired token or a rate limit apart from other failures.

const API_URL = "https://api.github.com";
const API_VERSION = "2022-11-28";
const REQUEST_TIMEOUT_MS = 10_000;

export class GitHubApiError extends Error {
  name = "GitHubApiError";
  constructor(
    message: string,
    readonly status: number,
    /** GitHub's own explanation, when it sends one (e.g. a 422 validation message). */
    readonly detail?: string,
  ) {
    super(message);
  }
}

/** The access token was revoked or expired (HTTP 401). */
export class GitHubAuthError extends GitHubApiError {
  name = "GitHubAuthError";
}

/**
 * Primary or secondary rate limit hit: HTTP 429, a 403 with no remaining quota
 * or a `retry-after` header, or a GraphQL `RATE_LIMITED` error.
 */
export class GitHubRateLimitError extends GitHubApiError {
  name = "GitHubRateLimitError";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requestHeaders(accessToken: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "X-GitHub-Api-Version": API_VERSION,
  };
}

function toApiError(response: Response, request: string): GitHubApiError {
  const { status } = response;
  if (status === 401) {
    return new GitHubAuthError(`GitHub rejected the access token (${request})`, status);
  }
  const isRateLimited =
    status === 429 ||
    (status === 403 &&
      (response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after")));
  if (isRateLimited) {
    return new GitHubRateLimitError(`GitHub rate limit reached (${request})`, status);
  }
  return new GitHubApiError(`GitHub request failed with HTTP ${status} (${request})`, status);
}

/** GET a REST endpoint. Resolves to `null` on 404, throws a GitHubApiError otherwise. */
export async function githubGet(path: string, accessToken: string): Promise<unknown> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: requestHeaders(accessToken),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 404) return null;
  if (!response.ok) throw toApiError(response, `GET ${path}`);
  return response.json();
}

// Reads GitHub's error message ("message" plus validation "errors") for display.
async function readErrorDetail(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (!isRecord(body)) return undefined;
    const parts = [typeof body.message === "string" ? body.message : ""];
    if (Array.isArray(body.errors)) {
      for (const error of body.errors) {
        if (typeof error === "string") parts.push(error);
        else if (isRecord(error) && typeof error.message === "string") parts.push(error.message);
      }
    }
    return parts.filter(Boolean).join(" — ").slice(0, 300) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sends a write request (POST/PATCH/PUT/DELETE) with a JSON body. Unlike
 * githubGet, a 404 is an error here. Resolves to the parsed body (null if empty).
 */
export async function githubSend(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body: unknown,
  accessToken: string,
): Promise<unknown> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { ...requestHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = toApiError(response, `${method} ${path}`);
    const detail = await readErrorDetail(response);
    if (!detail || error instanceof GitHubAuthError || error instanceof GitHubRateLimitError) throw error;
    throw new GitHubApiError(error.message, error.status, detail);
  }
  // The write already succeeded: an unreadable body must not turn it into a failure.
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** POST a JSON body to a REST endpoint that answers with text (e.g. /markdown). */
export async function githubPostText(path: string, body: unknown, accessToken: string): Promise<string> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...requestHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw toApiError(response, `POST ${path}`);
  return response.text();
}

/** Run a GraphQL query and return its `data`. GraphQL errors are thrown. */
export async function githubGraphQL(
  query: string,
  variables: Record<string, unknown>,
  accessToken: string,
): Promise<unknown> {
  const response = await fetch(`${API_URL}/graphql`, {
    method: "POST",
    headers: { ...requestHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw toApiError(response, "POST /graphql");

  const body: unknown = await response.json();
  if (!isRecord(body)) {
    throw new GitHubApiError("Unexpected GraphQL response shape", response.status);
  }
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const first = body.errors[0];
    const message = isRecord(first) && typeof first.message === "string" ? first.message : "unknown error";
    if (isRecord(first) && first.type === "RATE_LIMITED") {
      throw new GitHubRateLimitError(`GitHub rate limit reached (POST /graphql)`, response.status);
    }
    throw new GitHubApiError(`GraphQL error: ${message}`, response.status);
  }
  return body.data;
}
