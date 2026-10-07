import { GitHubApiError, githubGet, isRecord } from "./client";

/**
 * Verified email addresses of the authenticated user. GitHub only accepts one
 * of these as the public profile email (needs the `user` scope).
 */
export async function fetchVerifiedEmails(accessToken: string): Promise<string[]> {
  const data = await githubGet("/user/emails", accessToken);
  if (!Array.isArray(data)) {
    throw new GitHubApiError("Unexpected response from GET /user/emails", 200);
  }
  return data.flatMap((item) =>
    isRecord(item) && item.verified === true && typeof item.email === "string" ? [item.email] : [],
  );
}
