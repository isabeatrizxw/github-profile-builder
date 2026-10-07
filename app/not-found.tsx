import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { primaryButton } from "@/components/button-styles";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted">{t("description")}</p>
      <Link href="/drafts" className={`${primaryButton} self-start`}>
        {t("drafts")}
      </Link>
    </div>
  );
}
