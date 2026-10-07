import "server-only";

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireEnv } from "./env";
import type { GitHubUser } from "./github/oauth";

type SessionData = {
  accessToken?: string;
  user?: GitHubUser;
};

const SESSION_COOKIE = "gpb_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const MIN_SECRET_LENGTH = 32;

function getSessionSecret(): string {
  const secret = requireEnv("SESSION_SECRET");
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`);
  }
  return secret;
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), {
    cookieName: SESSION_COOKIE,
    password: getSessionSecret(),
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  });
}

export async function getCurrentUser(): Promise<GitHubUser | null> {
  const session = await getSession();
  return session.user && session.accessToken ? session.user : null;
}

// Use at the top of every page or action of the authenticated area.
export async function requireSession(): Promise<{ user: GitHubUser; accessToken: string }> {
  const session = await getSession();
  if (!session.user || !session.accessToken) redirect("/");
  return { user: session.user, accessToken: session.accessToken };
}

export async function requireUser(): Promise<GitHubUser> {
  return (await requireSession()).user;
}
