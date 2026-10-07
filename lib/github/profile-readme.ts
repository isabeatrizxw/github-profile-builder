import { GitHubApiError, githubGet, githubSend, isRecord } from "./client";

// The profile README lives in the public repository named after the user
// (<login>/<login>). Writes need the `public_repo` scope and only happen in the
// apply step, after explicit confirmation.

export const README_COMMIT_MESSAGE = "Update profile README (via GitHub Profile Builder)";
const NEW_README_PATH = "README.md";

export type CurrentProfileReadme =
  /** No public <login>/<login> repository (missing, or private: both answer 404). */
  | { status: "no-public-repo" }
  | { status: "no-readme" }
  | { status: "ready"; path: string; sha: string; markdown: string };

function repoPath(login: string): string {
  const name = encodeURIComponent(login);
  return `/repos/${name}/${name}`;
}

export async function fetchCurrentProfileReadme(login: string, accessToken: string): Promise<CurrentProfileReadme> {
  const repo = await githubGet(repoPath(login), accessToken);
  if (repo === null || (isRecord(repo) && repo.private === true)) return { status: "no-public-repo" };

  const readme = await githubGet(`${repoPath(login)}/readme`, accessToken);
  if (readme === null) return { status: "no-readme" };
  if (
    !isRecord(readme) ||
    typeof readme.path !== "string" ||
    typeof readme.sha !== "string" ||
    typeof readme.content !== "string"
  ) {
    throw new GitHubApiError("Unexpected response from GET /readme", 200);
  }
  return {
    status: "ready",
    path: readme.path,
    sha: readme.sha,
    markdown: Buffer.from(readme.content, "base64").toString("utf8"),
  };
}

/** Creates the public profile repository. GitHub answers 422 if the name is taken (e.g. a private repo). */
export async function createProfileRepository(login: string, accessToken: string): Promise<void> {
  await githubSend("POST", "/user/repos", { name: login, private: false, auto_init: false }, accessToken);
}

/** Creates or replaces the README file. `sha` is required to replace an existing file. */
export async function writeProfileReadme(
  login: string,
  accessToken: string,
  markdown: string,
  existing?: { path: string; sha: string },
): Promise<void> {
  const path = existing?.path ?? NEW_README_PATH;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  await githubSend(
    "PUT",
    `${repoPath(login)}/contents/${encodedPath}`,
    {
      message: README_COMMIT_MESSAGE,
      content: Buffer.from(markdown, "utf8").toString("base64"),
      ...(existing ? { sha: existing.sha } : {}),
    },
    accessToken,
  );
}
