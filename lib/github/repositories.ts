import { GitHubApiError, githubGet, githubGraphQL, isRecord } from "./client";

export type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  isFork: boolean;
  isArchived: boolean;
  /** ISO 8601 date of the last push, e.g. "2026-09-30T12:00:00Z". */
  pushedAt: string | null;
};

export type PinnedRepository = {
  nameWithOwner: string;
  url: string;
};

const PAGE_SIZE = 100;
// Safety cap: 10 pages = 1000 repositories, far beyond a typical profile.
const MAX_PAGES = 10;

function parseRepository(item: unknown): GitHubRepository | null {
  if (
    !isRecord(item) ||
    typeof item.id !== "number" ||
    typeof item.name !== "string" ||
    typeof item.full_name !== "string" ||
    typeof item.html_url !== "string"
  ) {
    return null;
  }
  return {
    id: item.id,
    name: item.name,
    fullName: item.full_name,
    description: typeof item.description === "string" ? item.description : null,
    htmlUrl: item.html_url,
    homepage: typeof item.homepage === "string" && item.homepage !== "" ? item.homepage : null,
    language: typeof item.language === "string" ? item.language : null,
    stars: typeof item.stargazers_count === "number" ? item.stargazers_count : 0,
    forks: typeof item.forks_count === "number" ? item.forks_count : 0,
    topics: Array.isArray(item.topics)
      ? item.topics.filter((topic): topic is string => typeof topic === "string")
      : [],
    isFork: item.fork === true,
    isArchived: item.archived === true,
    pushedAt: typeof item.pushed_at === "string" ? item.pushed_at : null,
  };
}

/** All public repositories owned by the user, most recently pushed first. */
export async function fetchOwnedPublicRepositories(
  accessToken: string,
): Promise<GitHubRepository[]> {
  const repositories: GitHubRepository[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const query = new URLSearchParams({
      visibility: "public",
      affiliation: "owner",
      sort: "pushed",
      per_page: String(PAGE_SIZE),
      page: String(page),
    });
    const data = await githubGet(`/user/repos?${query}`, accessToken);
    if (!Array.isArray(data)) {
      throw new GitHubApiError("Unexpected response from GET /user/repos", 200);
    }
    const items = data;

    repositories.push(
      ...items.map(parseRepository).filter((repo): repo is GitHubRepository => repo !== null),
    );
    if (items.length < PAGE_SIZE) break;
  }

  return repositories;
}

/**
 * Repositories the user can showcase as README projects: every public owned
 * repository except the profile README repository itself (<login>/<login>).
 * Shared by the editor and the apply step so both see the same list.
 */
export function showcaseRepositories(repositories: GitHubRepository[], login: string): GitHubRepository[] {
  const profileRepo = `${login}/${login}`.toLowerCase();
  return repositories.filter((repo) => repo.fullName.toLowerCase() !== profileRepo);
}

const PINNED_QUERY = `
  query {
    viewer {
      pinnedItems(first: 6, types: [REPOSITORY]) {
        nodes {
          ... on Repository {
            nameWithOwner
            url
          }
        }
      }
    }
  }
`;

/**
 * Repositories pinned on the profile. Read-only: the GitHub API has no way to
 * change pinned items, so users must do that manually on github.com.
 */
export async function fetchPinnedRepositories(accessToken: string): Promise<PinnedRepository[]> {
  const data = await githubGraphQL(PINNED_QUERY, {}, accessToken);
  const nodes =
    isRecord(data) &&
    isRecord(data.viewer) &&
    isRecord(data.viewer.pinnedItems) &&
    Array.isArray(data.viewer.pinnedItems.nodes)
      ? data.viewer.pinnedItems.nodes
      : [];

  return nodes.flatMap((node) =>
    isRecord(node) && typeof node.nameWithOwner === "string" && typeof node.url === "string"
      ? [{ nameWithOwner: node.nameWithOwner, url: node.url }]
      : [],
  );
}
