import { githubSend } from "./client";

// Writes to the authenticated user's profile. Only called from the apply step,
// after the user explicitly confirmed. Needs the `user` scope.

/** Profile fields accepted by PATCH /user (email is sent separately). */
export type ProfileFieldsUpdate = Partial<{
  name: string;
  bio: string;
  location: string;
  company: string;
  blog: string;
  /** null removes it. */
  twitter_username: string | null;
  hireable: boolean;
}>;

export async function updateProfileFields(accessToken: string, fields: ProfileFieldsUpdate): Promise<void> {
  await githubSend("PATCH", "/user", fields, accessToken);
}

/**
 * Sets the public profile email. Sent on its own because GitHub rejects
 * addresses that are not verified, and that must not block the other fields.
 */
export async function updatePublicEmail(accessToken: string, email: string): Promise<void> {
  await githubSend("PATCH", "/user", { email }, accessToken);
}

export async function addSocialAccounts(accessToken: string, urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await githubSend("POST", "/user/social_accounts", { account_urls: urls }, accessToken);
}

export async function removeSocialAccounts(accessToken: string, urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await githubSend("DELETE", "/user/social_accounts", { account_urls: urls }, accessToken);
}
