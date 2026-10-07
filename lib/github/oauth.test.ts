import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizeUrl,
  buildRedirectUri,
  exchangeCodeForToken,
  fetchAuthenticatedUser,
  GitHubOAuthError,
} from "./oauth";

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildRedirectUri", () => {
  it("appends the callback path to the app URL", () => {
    expect(buildRedirectUri("http://localhost:3000")).toBe("http://localhost:3000/api/auth/callback");
    expect(buildRedirectUri("https://example.com/")).toBe("https://example.com/api/auth/callback");
  });
});

describe("buildAuthorizeUrl", () => {
  it("includes client id, redirect uri, scopes and state", () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: "client-123",
        redirectUri: "http://localhost:3000/api/auth/callback",
        state: "random-state",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/callback");
    expect(url.searchParams.get("scope")).toBe("user public_repo");
    expect(url.searchParams.get("state")).toBe("random-state");
  });
});

describe("exchangeCodeForToken", () => {
  const params = {
    clientId: "client-123",
    clientSecret: "secret-456",
    code: "code-789",
    redirectUri: "http://localhost:3000/api/auth/callback",
  };

  it("returns the access token on success", async () => {
    const fetchMock = mockFetch({ access_token: "gho_test", token_type: "bearer" });

    await expect(exchangeCodeForToken(params)).resolves.toBe("gho_test");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://github.com/login/oauth/access_token");
    expect(JSON.parse(init.body)).toEqual({
      client_id: "client-123",
      client_secret: "secret-456",
      code: "code-789",
      redirect_uri: "http://localhost:3000/api/auth/callback",
    });
  });

  it("throws when GitHub answers 200 with an error field", async () => {
    mockFetch({ error: "bad_verification_code" });

    await expect(exchangeCodeForToken(params)).rejects.toThrow(
      new GitHubOAuthError("Token exchange failed: bad_verification_code"),
    );
  });

  it("throws on a non-2xx response", async () => {
    mockFetch({}, 500);

    await expect(exchangeCodeForToken(params)).rejects.toThrow("HTTP 500");
  });
});

describe("fetchAuthenticatedUser", () => {
  it("maps the GitHub user to the session shape", async () => {
    const fetchMock = mockFetch({
      id: 1,
      login: "octocat",
      name: "Mona Lisa",
      avatar_url: "https://avatars.githubusercontent.com/u/1",
    });

    await expect(fetchAuthenticatedUser("gho_test")).resolves.toEqual({
      id: 1,
      login: "octocat",
      name: "Mona Lisa",
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
    });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer gho_test");
  });

  it("keeps a missing name as null", async () => {
    mockFetch({ id: 1, login: "octocat", name: null, avatar_url: "https://a/u/1" });

    await expect(fetchAuthenticatedUser("gho_test")).resolves.toMatchObject({ name: null });
  });

  it("throws on 401", async () => {
    mockFetch({ message: "Bad credentials" }, 401);

    await expect(fetchAuthenticatedUser("gho_test")).rejects.toThrow("HTTP 401");
  });

  it("throws on an unexpected response shape", async () => {
    mockFetch({ login: "octocat" });

    await expect(fetchAuthenticatedUser("gho_test")).rejects.toThrow("Unexpected response shape");
  });
});
