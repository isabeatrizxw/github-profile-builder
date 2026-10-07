import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireEnv } from "@/lib/env";
import { buildAuthorizeUrl, buildRedirectUri, OAUTH_STATE_COOKIE } from "@/lib/github/oauth";

const STATE_TTL_SECONDS = 60 * 10;

// Starts the GitHub OAuth flow. The random `state` is kept in a short-lived
// cookie and checked in the callback to block CSRF on the sign-in.
export async function GET() {
  const state = randomBytes(32).toString("hex");

  (await cookies()).set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: STATE_TTL_SECONDS,
  });

  redirect(
    buildAuthorizeUrl({
      clientId: requireEnv("GITHUB_CLIENT_ID"),
      redirectUri: buildRedirectUri(requireEnv("APP_URL")),
      state,
    }),
  );
}
