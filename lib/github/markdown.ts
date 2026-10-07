import { githubPostText } from "./client";

/**
 * Renders Markdown with GitHub's own renderer (GitHub Flavored Markdown), so
 * the preview matches what github.com shows. GitHub sanitizes the HTML.
 * `context` resolves relative links and @mentions like the profile repository.
 */
export async function renderMarkdown(markdown: string, login: string, accessToken: string): Promise<string> {
  return githubPostText(
    "/markdown",
    { text: markdown, mode: "gfm", context: `${login}/${login}` },
    accessToken,
  );
}
