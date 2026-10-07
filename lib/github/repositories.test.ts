import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOwnedPublicRepositories, fetchPinnedRepositories } from "./repositories";
import { mockGitHub } from "./test-utils";

function repo(id: number) {
  return {
    id,
    name: `repo-${id}`,
    full_name: `octocat/repo-${id}`,
    description: null,
    html_url: `https://github.com/octocat/repo-${id}`,
    homepage: "",
    language: "TypeScript",
    stargazers_count: 3,
    forks_count: 1,
    topics: ["nextjs"],
    fork: false,
    archived: false,
    pushed_at: "2026-09-30T12:00:00Z",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOwnedPublicRepositories", () => {
  it("maps repositories", async () => {
    mockGitHub([["/user/repos", { body: [repo(1)] }]]);

    await expect(fetchOwnedPublicRepositories("gho_test")).resolves.toEqual([
      {
        id: 1,
        name: "repo-1",
        fullName: "octocat/repo-1",
        description: null,
        htmlUrl: "https://github.com/octocat/repo-1",
        homepage: null,
        language: "TypeScript",
        stars: 3,
        forks: 1,
        topics: ["nextjs"],
        isFork: false,
        isArchived: false,
        pushedAt: "2026-09-30T12:00:00Z",
      },
    ]);
  });

  it("requests only public repositories owned by the user", async () => {
    const fetchMock = mockGitHub([["/user/repos", { body: [] }]]);

    await fetchOwnedPublicRepositories("gho_test");

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("visibility")).toBe("public");
    expect(url.searchParams.get("affiliation")).toBe("owner");
  });

  it("follows pages until a page is not full", async () => {
    const fullPage = Array.from({ length: 100 }, (_, index) => repo(index + 1));
    const fetchMock = mockGitHub([
      ["&page=1", { body: fullPage }],
      ["&page=2", { body: [repo(101)] }],
    ]);

    const repositories = await fetchOwnedPublicRepositories("gho_test");

    expect(repositories).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("fetchPinnedRepositories", () => {
  it("returns pinned repositories from GraphQL", async () => {
    mockGitHub([
      [
        "/graphql",
        {
          body: {
            data: {
              viewer: {
                pinnedItems: {
                  nodes: [{ nameWithOwner: "octocat/hello", url: "https://github.com/octocat/hello" }],
                },
              },
            },
          },
        },
      ],
    ]);

    await expect(fetchPinnedRepositories("gho_test")).resolves.toEqual([
      { nameWithOwner: "octocat/hello", url: "https://github.com/octocat/hello" },
    ]);
  });

  it("returns an empty list when nothing is pinned", async () => {
    mockGitHub([["/graphql", { body: { data: { viewer: { pinnedItems: { nodes: [] } } } } }]]);

    await expect(fetchPinnedRepositories("gho_test")).resolves.toEqual([]);
  });
});
