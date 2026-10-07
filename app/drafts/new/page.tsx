import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { NewDraftForm } from "@/components/new-draft-form";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("drafts.new");
  return { title: t("title") };
}

export default async function NewDraftPage() {
  await requireUser();
  const t = await getTranslations("drafts.new");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <Link href="/drafts" className="inline-flex min-h-11 items-center self-start text-sm text-muted underline-offset-4 hover:underline">
        <span aria-hidden="true">←</span>&nbsp;{t("back")}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted">{t("description")}</p>
        <p className="text-sm text-muted">{t("readmeNote")}</p>
      </div>
      <NewDraftForm />
    </div>
  );
}
