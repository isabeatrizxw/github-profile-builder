"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useTranslations } from "next-intl";
import { primaryButton, secondaryButton } from "@/components/button-styles";

// Shown when a page fails unexpectedly. In production `error.message` is a
// generic text from Next.js, so it is not displayed; the digest matches the
// server logs.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("errorPage");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted">{t("description")}</p>
      {error.digest && <p className="font-mono text-xs text-muted">{error.digest}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className={primaryButton}>
          {t("retry")}
        </button>
        <Link href="/" className={secondaryButton}>
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
