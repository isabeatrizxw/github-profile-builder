"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createDraftAction } from "@/app/drafts/actions";
import { FIELD_MAX_LENGTH, MAX_DRAFTS_PER_USER } from "@/lib/drafts/content";
import { alertBox, primaryButton } from "./button-styles";
import { CharCount } from "./char-count";

export function NewDraftForm() {
  const t = useTranslations("drafts");
  const [result, formAction, isPending] = useActionState(createDraftAction, null);
  const [title, setTitle] = useState("");

  // onSubmit instead of <form action> so a failed attempt keeps the typed name.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          {t("new.titleLabel")}
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={FIELD_MAX_LENGTH.title}
          aria-describedby="title-hint"
          className="min-h-11 rounded-lg border border-border-strong bg-surface px-3"
        />
        <div className="flex items-start justify-between gap-3">
          <p id="title-hint" className="text-sm text-muted">
            {t("new.titleHint")}
          </p>
          <CharCount length={title.length} max={FIELD_MAX_LENGTH.title} />
        </div>
      </div>

      {result?.error && (
        <p role="alert" className={alertBox}>
          {result.error === "limitReached"
            ? t("errors.limitReached", { max: MAX_DRAFTS_PER_USER })
            : t(`errors.${result.error}`)}
        </p>
      )}

      <p role="status" className="sr-only">{isPending ? t("new.submitting") : ""}</p>
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? t("new.submitting") : t("new.submit")}
      </button>
    </form>
  );
}
