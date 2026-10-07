import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/i18n/actions";
import { locales } from "@/i18n/config";

const SHORT_LABELS = { "pt-BR": "PT", en: "EN" } as const;

// Plain form + Server Action: works without client JavaScript.
export async function LocaleSwitcher() {
  const currentLocale = await getLocale();
  const t = await getTranslations("localeSwitcher");

  return (
    <form action={setLocale}>
      <div
        role="group"
        aria-label={t("label")}
        className="flex rounded-lg border border-border p-0.5"
      >
        {locales.map((locale) => {
          const isCurrent = locale === currentLocale;
          return (
            <button
              key={locale}
              type="submit"
              name="locale"
              value={locale}
              lang={locale}
              aria-label={`${SHORT_LABELS[locale]}, ${t(locale)}`}
              aria-pressed={isCurrent}
              className={`min-h-11 min-w-11 rounded-md px-2 text-sm font-medium transition-colors ${
                isCurrent
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {SHORT_LABELS[locale]}
            </button>
          );
        })}
      </div>
    </form>
  );
}
