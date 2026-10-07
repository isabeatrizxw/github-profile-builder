import { useTranslations } from "next-intl";

// Route-level loading state for pages that wait on GitHub before rendering.
export function PageLoading() {
  const t = useTranslations("loading");

  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6">
      <p role="status" className="sr-only">{t("page")}</p>
      <div aria-hidden="true" className="flex flex-col gap-6 motion-safe:animate-pulse">
        <div className="h-4 w-40 rounded bg-border" />
        <div className="h-8 w-72 max-w-full rounded bg-border" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 rounded-xl bg-border" />
          <div className="h-64 rounded-xl bg-border" />
        </div>
      </div>
    </div>
  );
}
