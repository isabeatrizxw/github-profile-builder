import "server-only";

import { redirect } from "next/navigation";
import { GitHubAuthError } from "./client";

/**
 * Runs a GitHub read for a page or server action.
 * - Revoked/expired token: redirects to clear the session.
 * - Any other failure: logs it and resolves to null so the caller can show a message.
 * Call it outside try/catch: redirect() works by throwing.
 */
export async function readGitHubOrNull<T>(read: () => Promise<T>, what: string): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof GitHubAuthError) redirect("/api/auth/expired");
    console.error(`Reading ${what} from GitHub failed:`, error);
    return null;
  }
}
