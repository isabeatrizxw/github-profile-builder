import Image from "next/image";
import { useTranslations } from "next-intl";
import { signOut } from "@/lib/auth-actions";
import type { GitHubUser } from "@/lib/github/oauth";

export function UserMenu({ user }: { user: GitHubUser }) {
  const t = useTranslations("userMenu");

  return (
    <div className="flex items-center gap-3">
      {/* Hidden on narrow screens so the header fits in one line. */}
      <span className="hidden items-center gap-2 text-sm sm:flex">
        <Image
          src={user.avatarUrl}
          alt={t("avatarAlt", { login: user.login })}
          width={28}
          height={28}
          className="rounded-full"
        />
        <span className="font-medium">{user.login}</span>
      </span>
      {/* data-leaves-page lets an editor with unsaved changes ask first. */}
      <form action={signOut} data-leaves-page="">
        <button
          type="submit"
          className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
