"use client";

import { useTranslations } from "next-intl";

// Visible "42/160" counter for fields with a length limit. Screen readers only
// hear it near the limit, so typing is not interrupted on every keystroke.
export function CharCount({ length, max }: { length: number; max: number }) {
  const t = useTranslations("charCount");
  const remaining = max - length;
  const isNear = remaining <= Math.max(5, Math.floor(max * 0.1));

  return (
    <>
      <span
        aria-hidden="true"
        className={`shrink-0 text-xs tabular-nums ${remaining <= 0 ? "text-red-700 dark:text-red-400" : "text-muted"}`}
      >
        {length}/{max}
      </span>
      <span className="sr-only" aria-live="polite">
        {isNear ? t("remaining", { count: Math.max(remaining, 0) }) : ""}
      </span>
    </>
  );
}
