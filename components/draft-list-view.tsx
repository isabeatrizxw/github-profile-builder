"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { bulkDraftsAction } from "@/app/drafts/actions";
import { MAX_DRAFTS_PER_USER } from "@/lib/drafts/content";
import { quietButton } from "./button-styles";
import { DraftListActions } from "./draft-list-actions";

export type DraftListItem = { id: string; title: string; updatedLabel: string };

export function DraftListView({ drafts }: { drafts: DraftListItem[] }) {
  const t = useTranslations("drafts");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [result, formAction, isPending] = useActionState(bulkDraftsAction, null);
  const [wasPending, setWasPending] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Ids that were deleted (here or elsewhere) drop out of the selection.
  const selectedIds = drafts.filter((draft) => selected.has(draft.id)).map((draft) => draft.id);
  const allSelected = drafts.length > 0 && selectedIds.length === drafts.length;

  // After a successful bulk action, start a fresh selection.
  if (isPending !== wasPending) {
    setWasPending(isPending);
    if (!isPending && !result?.error) setSelected(new Set());
  }

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedIds.length > 0 && !allSelected;
  }, [selectedIds.length, allSelected]);

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Deleting is permanent: confirm with the number of drafts.
  function confirmBulk(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === "delete" && !window.confirm(t("confirmBulkDelete", { count: selectedIds.length }))) {
      event.preventDefault();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        action={formAction}
        onSubmit={confirmBulk}
        aria-label={t("bulkLabel")}
        className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-surface px-4 py-1"
      >
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            onChange={(event) => setSelected(event.target.checked ? new Set(drafts.map((draft) => draft.id)) : new Set())}
            className="size-5 accent-accent"
          />
          {t("selectAll")}
        </label>
        <span className="text-sm text-muted" aria-live="polite">{t("selected", { count: selectedIds.length })}</span>
        {selectedIds.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
        <div className="flex gap-1 sm:ml-auto">
          <button type="submit" name="intent" value="duplicate" disabled={selectedIds.length === 0 || isPending} className={quietButton}>
            {t("bulkDuplicate")}
          </button>
          <button type="submit" name="intent" value="delete" disabled={selectedIds.length === 0 || isPending} className={quietButton}>
            {t("bulkDelete")}
          </button>
        </div>
        {result?.error && (
          <p role="alert" className="w-full pb-2 text-sm text-red-700 dark:text-red-400">
            {result.error === "limitReached"
              ? t("errors.limitReached", { max: MAX_DRAFTS_PER_USER })
              : t(`errors.${result.error}`)}
          </p>
        )}
      </form>

      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {drafts.map((draft) => (
          <li key={draft.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(draft.id)}
                onChange={(event) => toggle(draft.id, event.target.checked)}
                aria-label={t("selectDraft", { title: draft.title })}
                className="mt-3 size-5 shrink-0 accent-accent"
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <Link href={`/drafts/${draft.id}`} className="inline-flex min-h-11 items-center break-words font-medium underline-offset-4 hover:underline">
                  {draft.title}
                </Link>
                <p className="text-sm text-muted">{draft.updatedLabel}</p>
              </div>
            </div>
            <DraftListActions id={draft.id} title={draft.title} />
          </li>
        ))}
      </ul>
    </div>
  );
}
