import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { alertBox } from "@/components/button-styles";
import { ApplyReview } from "@/components/apply-review";
import { loadApplyContext } from "@/lib/apply/load";
import { requireSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apply");
  return { title: t("title") };
}

// Review step: shows what applying the saved draft would change on GitHub.
// Nothing is written until the user confirms on this page.
export default async function ApplyPage({ params }: PageProps<"/drafts/[id]/apply">) {
  const { user, accessToken } = await requireSession();
  const { id } = await params;
  const [t, context] = await Promise.all([getTranslations("apply"), loadApplyContext(id, user, accessToken)]);
  if (context.status === "notFound") notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <Link href={`/drafts/${id}`} className="inline-flex min-h-11 items-center self-start text-sm text-muted underline-offset-4 hover:underline">
        <span aria-hidden="true">←</span>&nbsp;{t("back")}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        {context.status === "ok" && <p className="break-words text-muted">{context.draft.title}</p>}
        <p className="text-muted">{t("intro")}</p>
      </div>
      {context.status === "github" || context.status === "loginChanged" ? (
        <p role="alert" className={alertBox}>
          {t(`errors.${context.status}`)}
        </p>
      ) : (
        <ApplyReview
          draftId={id}
          login={user.login}
          plan={context.plan}
          fingerprints={context.fingerprints}
          readmeBlocked={context.readmeBlocked}
        />
      )}
    </div>
  );
}
