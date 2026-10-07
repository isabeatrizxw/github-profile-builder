import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { requireEnv } from "@/lib/env";
import {
  buildRedirectUri,
  exchangeCodeForToken,
  fetchAuthenticatedUser,
  OAUTH_STATE_COOKIE,
} from "@/lib/github/oauth";
import { getSession } from "@/lib/session";

function isSameState(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// GitHub redirects here after the user authorizes (or denies) the app.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth" });

  if (searchParams.get("error") === "access_denied") {
    redirect("/?error=access_denied");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || !expectedState || !isSameState(state, expectedState)) {
    redirect("/?error=invalid_state");
  }

  try {
    const accessToken = await exchangeCodeForToken({
      clientId: requireEnv("GITHUB_CLIENT_ID"),
      clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
      code,
      redirectUri: buildRedirectUri(requireEnv("APP_URL")),
    });
    const user = await fetchAuthenticatedUser(accessToken);

    const session = await getSession();
    session.accessToken = accessToken;
    session.user = user;
    await session.save();
  } catch (error) {
    console.error("GitHub OAuth callback failed:", error);
    redirect("/?error=oauth_failed");
  }

  redirect("/drafts");
}
