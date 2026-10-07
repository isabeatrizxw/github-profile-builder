import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { primaryButton } from "@/components/button-styles";
import { DraftListView } from "@/components/draft-list-view";
import { ProfileSummary, ProfileSummarySkeleton } from "@/components/profile-summary";
import { listDrafts, type DraftSummary } from "@/lib/drafts/repository";
import { requireSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("drafts");
  return { title: t("title") };
}

export default async function DraftsPage() {
  const { user, accessToken } = await requireSession();
  const [t, tLoading] = await Promise.all([getTranslations("drafts"), getTranslations("loading")]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <Link href="/drafts/new" className={primaryButton}>
          {t("newDraft")}
        </Link>
      </div>

      <Suspense fallback={<ProfileSummarySkeleton />}>
        <ProfileSummary accessToken={accessToken} />
      </Suspense>

      <section aria-labelledby="drafts-list-title" className="flex flex-col gap-4">
        <h2 id="drafts-list-title" className="text-lg font-semibold">{t("listTitle")}</h2>
        <Suspense
          fallback={
            <div aria-busy="true">
              <p role="status" className="sr-only">{tLoading("page")}</p>
              <div aria-hidden="true" className="h-20 rounded-xl bg-border motion-safe:animate-pulse" />
            </div>
          }
        >
          <DraftList ownerGithubId={user.id} />
        </Suspense>
      </section>
    </div>
  );
}

async function DraftList({ ownerGithubId }: { ownerGithubId: number }) {
  const [t, format] = await Promise.all([getTranslations("drafts"), getFormatter()]);

  let drafts: DraftSummary[];
  try {
    drafts = await listDrafts(ownerGithubId);
  } catch (error) {
    console.error("Listing drafts failed:", error);
    return <p role="alert" className="text-sm">{t("errors.database")}</p>;
  }

  if (drafts.length === 0) {
    return <p className="text-muted">{t("empty")}</p>;
  }

  return (
    <DraftListView
      drafts={drafts.map((draft) => ({
        id: draft.id,
        title: draft.title,
        updatedLabel: t("updatedAt", { date: format.dateTime(draft.updatedAt, { dateStyle: "medium", timeStyle: "short" }) }),
      }))}
    />
  );
}
