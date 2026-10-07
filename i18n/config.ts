export const locales = ["pt-BR", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-BR";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

// Picks the first supported language from an Accept-Language header,
// e.g. "en-US,en;q=0.9,pt;q=0.8" -> "en".
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const tags = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, quality] = part.trim().split(/;\s*q=/);
      return { tag: tag.toLowerCase(), q: quality ? Number(quality) || 0 : 1 };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    if (tag.startsWith("pt")) return "pt-BR";
    if (tag.startsWith("en")) return "en";
  }
  return defaultLocale;
}
