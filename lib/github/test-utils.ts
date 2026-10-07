import { vi } from "vitest";

type Route = { status?: number; body?: unknown; headers?: Record<string, string> };

/**
 * Stubs global fetch with responses picked by URL substring (first match wins).
 * Unmatched requests fail the test loudly.
 */
export function mockGitHub(routes: Array<[match: string, route: Route]>) {
  // `init` is declared so tests can inspect the method and body of each call.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const found = routes.find(([match]) => url.includes(match));
    if (!found) throw new Error(`Unexpected request in test: ${url}`);
    const { status = 200, body = {}, headers = {} } = found[1];
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
