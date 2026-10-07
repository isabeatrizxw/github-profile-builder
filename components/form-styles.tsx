"use client";

import { useTranslations } from "next-intl";
import type { FieldError } from "@/lib/drafts/content";

// Shared by the draft editor, its README settings and other forms.

export const INPUT_CLASS =
  "min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 aria-invalid:border-red-600";
export const ERROR_CLASS = "text-sm text-red-700 dark:text-red-400";
/** A bordered radio/checkbox option card. */
export const OPTION_CLASS =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border-strong bg-surface p-3 has-checked:border-accent";

export function useErrorMessage() {
  const t = useTranslations("draftEditor.errors");
  return (error: FieldError) =>
    error.code === "tooLong" || error.code === "tooMany" ? t(error.code, { max: error.max }) : t(error.code);
}
