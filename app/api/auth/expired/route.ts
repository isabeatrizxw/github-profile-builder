import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// Server Components cannot change cookies, so pages that get a 401 from GitHub
// (token revoked on github.com) redirect here to clear the session.
// A forged request can only sign the user out, which is harmless.
export async function GET() {
  const session = await getSession();
  session.destroy();
  redirect("/?error=session_expired");
}
