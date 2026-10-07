import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { GitHubAuthError, GitHubRateLimitError } from "@/lib/github/client";
import { fetchProfile, type GitHubProfile } from "@/lib/github/profile";
import {
  fetchOwnedPublicRepositories,
  fetchPinnedRepositories,
  type PinnedRepository,
} from "@/lib/github/repositories";
import { ExternalLink } from "./external-link";

const SECTION_CLASS =
  "flex flex-col gap-6 rounded-xl border border-border bg-surface p-5 sm:p-6";

function loadGitHubData(accessToken: string) {
  return Promise.all([
    fetchProfile(accessToken),
    fetchOwnedPublicRepositories(accessToken),
    fetchPinnedRepositories(accessToken),
  ]);
}

export async function ProfileSummary({ accessToken }: { accessToken: string }) {
  const t = await getTranslations("profile");

  let data: Awaited<ReturnType<typeof loadGitHubData>>;
  try {
    data = await loadGitHubData(accessToken);
  } catch (error) {
    if (error instanceof GitHubAuthError) redirect("/api/auth/expired");
    console.error("Loading GitHub data failed:", error);
    return (
      <section role="alert" className={`${SECTION_CLASS} text-red-700 dark:text-red-400`}>
        <p>{error instanceof GitHubRateLimitError ? t("errors.rateLimited") : t("errors.generic")}</p>
        {/* Navigating to the same dynamic route re-runs this server component. */}
        <Link href="/drafts" className="self-start font-medium text-accent underline underline-offset-4">
          {t("errors.retry")}
        </Link>
      </section>
    );
  }

  const [profile, repositories, pinned] = data;

  return (
    <section aria-labelledby="profile-title" className={SECTION_CLASS}>
      <div className="flex flex-col gap-1">
        <h2 id="profile-title" className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted">{t("description")}</p>
      </div>
      <ProfileIdentity profile={profile} />
      <ProfileFields profile={profile} />
      <div className="grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("readme.title")}</h3>
          <p className="text-sm text-muted">
            {t(`readme.${profile.profileReadme}`, { login: profile.login })}
          </p>
          <p className="text-sm">{t("repositories", { count: repositories.length })}</p>
        </div>
        <PinnedRepositories pinned={pinned} />
      </div>
    </section>
  );
}

function ProfileIdentity({ profile }: { profile: GitHubProfile }) {
  const t = useTranslations("profile");

  return (
    <div className="flex items-start gap-4">
      <Image
        src={profile.avatarUrl}
        alt=""
        width={64}
        height={64}
        className="rounded-full border border-border"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold">{profile.name ?? profile.login}</p>
        <a
          href={profile.htmlUrl}
          className="text-sm text-muted underline-offset-4 hover:underline"
        >
          @{profile.login} · {t("viewOnGitHub")}
        </a>
        <p className="text-sm text-pretty">{profile.bio ?? t("notSet")}</p>
      </div>
    </div>
  );
}

function ProfileFields({ profile }: { profile: GitHubProfile }) {
  const t = useTranslations("profile");
  const fields = [
    { key: "location", value: profile.location },
    { key: "company", value: profile.company },
    { key: "blog", value: profile.blog && <ExternalLink value={profile.blog} /> },
    { key: "email", value: profile.email },
    { key: "twitter", value: profile.twitterUsername && `@${profile.twitterUsername}` },
    {
      key: "hireable",
      value: profile.hireable === null ? null : profile.hireable ? t("yes") : t("no"),
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {fields.map(({ key, value }) => (
          <div key={key} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-sm text-muted">{t(`fields.${key}`)}</dt>
            <dd className="break-words">{value || <span className="text-muted">{t("notSet")}</span>}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t("socialAccounts")}</h3>
        {profile.socialAccounts.length === 0 ? (
          <p className="text-sm text-muted">{t("noSocialAccounts")}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {profile.socialAccounts.map((account, index) => (
              <li key={`${index}-${account.url}`}>
                <ExternalLink value={account.url} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PinnedRepositories({ pinned }: { pinned: PinnedRepository[] }) {
  const t = useTranslations("profile");

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{t("pinned.title")}</h3>
      {pinned.length === 0 ? (
        <p className="text-sm text-muted">{t("pinned.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {pinned.map((repo) => (
            <li key={repo.nameWithOwner}>
              <a href={repo.url} className="break-all underline underline-offset-4">
                {repo.nameWithOwner}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">{t("pinned.note")}</p>
    </div>
  );
}

export function ProfileSummarySkeleton() {
  const t = useTranslations("profile");

  return (
    <section aria-busy="true" className={SECTION_CLASS}>
      <p className="sr-only" role="status">{t("loading")}</p>
      <div aria-hidden="true" className="flex flex-col gap-6 motion-safe:animate-pulse">
        <div className="h-5 w-56 rounded bg-border" />
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-border" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-40 rounded bg-border" />
            <div className="h-3 w-64 max-w-full rounded bg-border" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-10 rounded bg-border" />
          ))}
        </div>
      </div>
    </section>
  );
}
