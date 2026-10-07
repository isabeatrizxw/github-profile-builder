"use client";

import { useTranslations } from "next-intl";
import { CharCount } from "./char-count";
import { INPUT_CLASS } from "./form-styles";

/**
 * Optional title. The field starts with the recommended title; clearing it
 * removes the title. The value is "" (recommended, follows the README
 * language), custom text, or null (no title).
 */
export function OptionalTitleField(props: {
  id: string;
  label: string;
  /** Section or category name, so screen readers can tell the title fields apart. */
  owner: string;
  recommended: string;
  value: string | null;
  maxLength: number;
  onChange: (value: string | null) => void;
  className?: string;
}) {
  const t = useTranslations("readmeEditor.headings");
  const shown = props.value === null ? "" : props.value || props.recommended;
  return (
    <div className={`flex flex-col gap-1.5 ${props.className ?? ""}`}>
      <label htmlFor={props.id} className="text-sm font-medium">
        {props.label}<span className="sr-only"> ({props.owner})</span>
      </label>
      <div className="flex gap-2">
        <input id={props.id} type="text" value={shown} placeholder={t("none")} maxLength={props.maxLength}
          aria-describedby={`${props.id}-hint`} className={`${INPUT_CLASS} min-w-0 flex-1`}
          onChange={(event) => {
            const text = event.target.value;
            props.onChange(text.trim() === "" ? null : text === props.recommended ? "" : text);
          }} />
        {props.value !== "" && (
          <button type="button" onClick={() => props.onChange("")}
            className="min-h-11 shrink-0 rounded-lg border border-border-strong px-3 text-sm font-medium">
            {t("useRecommended")}
          </button>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <p id={`${props.id}-hint`} className="text-sm text-muted">{t("hint", { fallback: props.recommended })}</p>
        <CharCount length={shown.length} max={props.maxLength} />
      </div>
    </div>
  );
}
