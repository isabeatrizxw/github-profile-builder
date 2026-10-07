"use client";

import { useActionState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { draftListAction } from "@/app/drafts/actions";
import { MAX_DRAFTS_PER_USER } from "@/lib/drafts/content";
import { quietButton } from "./button-styles";

export function DraftListActions({ id, title }: { id: string; title: string }) {
  const t = useTranslations("drafts");
  const [result, formAction, isPending] = useActionState(draftListAction, null);

  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    // Deleting is permanent: always ask first.
    if (submitter?.value === "delete" && !window.confirm(t("confirmDelete", { title }))) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={confirmDelete} className="flex flex-col items-start gap-1 sm:items-end">
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-1">
        <button type="submit" name="intent" value="duplicate" disabled={isPending} className={quietButton}
          aria-label={`${t("duplicate")}: ${title}`}>
          {t("duplicate")}
        </button>
        <button type="submit" name="intent" value="delete" disabled={isPending} className={quietButton}
          aria-label={`${t("delete")}: ${title}`}>
          {t("delete")}
        </button>
      </div>
      {result?.error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {result.error === "limitReached"
            ? t("errors.limitReached", { max: MAX_DRAFTS_PER_USER })
            : t(`errors.${result.error}`)}
        </p>
      )}
    </form>
  );
}
