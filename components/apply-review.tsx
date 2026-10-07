"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { applyDraftAction, type ApplyState } from "@/app/drafts/[id]/apply/actions";
import type { StepResult } from "@/lib/apply/execute";
import { APPLY_PARTS, partHasChanges, type ApplyPart, type ApplyPlan } from "@/lib/apply/plan";
import { alertBox, primaryButton, secondaryButton } from "./button-styles";

type Props = {
  draftId: string;
  login: string;
  plan: ApplyPlan;
  fingerprints: Record<ApplyPart, string>;
  readmeBlocked: boolean;
};

const SECTION_CLASS = "flex flex-col gap-4 rounded-xl border border-border bg-surface p-5";

function useDisplayValue() {
  const t = useTranslations("apply");
  return function displayValue(value: string | boolean): ReactNode {
    if (typeof value === "boolean") return value ? t("yes") : t("no");
    return value || <span className="text-muted">{t("empty")}</span>;
  };
}

function ProfileChanges({ plan }: { plan: ApplyPlan }) {
  const t = useTranslations("apply");
  const display = useDisplayValue();
  const rows = [
    ...plan.profile.fields.map((change) => ({ key: change.field, label: t(`fields.${change.field}`), ...change })),
    ...(plan.profile.email ? [{ key: "email", label: t("fields.email"), ...plan.profile.email }] : []),
  ];
  return (
    <>
      <div tabIndex={0} role="region" aria-label={t("parts.profile")} className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium"><span className="sr-only">{t("field")}</span></th>
              <th scope="col" className="py-2 pr-4 font-medium">{t("current")}</th>
              <th scope="col" className="py-2 font-medium">{t("next")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.key} className="align-top">
                <th scope="row" className="py-2 pr-4 font-medium">{row.label}</th>
                <td className="py-2 pr-4 [overflow-wrap:anywhere]">{display(row.from)}</td>
                <td className="py-2 [overflow-wrap:anywhere]">{display(row.to)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {plan.profile.email?.to === "" && <p className="text-sm text-muted">{t("emailRemovalNote")}</p>}
    </>
  );
}

function SocialChanges({ plan }: { plan: ApplyPlan }) {
  const t = useTranslations("apply.social");
  const groups = [
    { key: "remove", label: t("remove"), urls: plan.social.remove },
    { key: "add", label: t("add"), urls: plan.social.add },
  ].filter((group) => group.urls.length > 0);
  return (
    <div className="flex flex-col gap-3 text-sm">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-1">
          <p className="font-medium">{group.label}</p>
          <ul className="flex flex-col gap-1 pl-4">
            {group.urls.map((url) => <li key={url} className="list-disc break-all">{url}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ReadmeChanges({ plan, login, blocked }: { plan: ApplyPlan; login: string; blocked: boolean }) {
  const t = useTranslations("apply.readme");
  const tPreview = useTranslations("readmePreview");
  const [tab, setTab] = useState<"next" | "current">("next");
  const { readme } = plan;
  if (readme.action === "none") return null;
  return (
    <div className="flex flex-col gap-3">
      {blocked && <p id="readme-blocked" role="alert" className="text-sm">{t("blocked")}</p>}
      <p className="text-sm">{t(readme.action, { login })}</p>
      {readme.missingProjects.length > 0 && (
        <p className="text-sm">{tPreview("missingProjects", { count: readme.missingProjects.length, names: readme.missingProjects.join(", ") })}</p>
      )}
      {readme.currentMarkdown !== null && (
        <div role="group" aria-label={t("tabsLabel")} className="flex self-start rounded-lg border border-border p-0.5">
          {(["next", "current"] as const).map((option) => (
            <button key={option} type="button" aria-pressed={tab === option} onClick={() => setTab(option)}
              className="min-h-11 rounded-md px-3 text-sm font-medium text-muted aria-pressed:bg-foreground aria-pressed:text-background">
              {t(option === "next" ? "nextTab" : "currentTab")}
            </button>
          ))}
        </div>
      )}
      <pre tabIndex={0} role="region" aria-label={t("tabsLabel")} className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-4 text-xs leading-5">
        <code>{tab === "current" && readme.currentMarkdown !== null ? readme.currentMarkdown : readme.nextMarkdown}</code>
      </pre>
    </div>
  );
}

function ApplyResults({ results, login }: { results: StepResult[]; login: string }) {
  const t = useTranslations("apply.results");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const allApplied = results.length > 0 && results.every((result) => result.status === "applied");
  const label = { applied: `✓ ${t("applied")}`, unconfirmed: `? ${t("unconfirmed")}`, failed: `✗ ${t("failed")}` };

  // Results replace the page's focus target so keyboard and screen-reader users land on them.
  useEffect(() => {
    headingRef.current?.focus();
  }, [results]);

  return (
    <section aria-labelledby="results-title" className={SECTION_CLASS}>
      <h2 id="results-title" ref={headingRef} tabIndex={-1} className="text-lg font-semibold">{t("title")}</h2>
      <p>{allApplied ? t("allApplied") : t("someFailed")}</p>
      <ul className="flex flex-col gap-2 text-sm">
        {results.map((result) => (
          <li key={result.step} className="flex flex-col gap-0.5">
            <span><span className="font-medium">{t(`steps.${result.step}`, { login })}:</span> {label[result.status]}</span>
            {result.status === "unconfirmed" && <span className="text-muted">{t("unconfirmedHelp")}</span>}
            {result.status === "failed" && <span className="text-muted">{t(`reasons.${result.reason}`, { login })}</span>}
            {result.status === "failed" && result.detail && <span className="text-muted">{t("githubSays", { detail: result.detail })}</span>}
          </li>
        ))}
      </ul>
      <a href={`https://github.com/${login}`} target="_blank" rel="noopener noreferrer" className="self-start font-medium text-accent underline underline-offset-4">
        {t("viewProfile")}
      </a>
    </section>
  );
}

export function ApplyReview({ draftId, login, plan, fingerprints, readmeBlocked }: Props) {
  const t = useTranslations("apply");
  const [state, formAction, isPending] = useActionState<ApplyState, FormData>(applyDraftAction.bind(null, draftId), { status: "idle" });
  const canApply = (part: ApplyPart) => partHasChanges(plan, part) && !(part === "readme" && readmeBlocked);
  // Only parts with changes start selected. After an apply the page reloads
  // the plan, so parts that are now up to date drop out automatically.
  const [deselected, setDeselected] = useState<ReadonlySet<ApplyPart>>(new Set());
  const selectedParts = APPLY_PARTS.filter((part) => canApply(part) && !deselected.has(part));
  const anythingToApply = APPLY_PARTS.some(canApply);
  const router = useRouter();
  const [noneSelected, setNoneSelected] = useState(false);

  function toggle(part: ApplyPart, checked: boolean) {
    setDeselected((current) => {
      const next = new Set(current);
      if (checked) next.delete(part);
      else next.add(part);
      return next;
    });
  }

  // Explicit confirmation before anything is sent to GitHub.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNoneSelected(selectedParts.length === 0);
    if (selectedParts.length === 0) return;
    const names = selectedParts.map((part) => t(`parts.${part}`)).join(", ");
    const createsRepo = selectedParts.includes("readme") && plan.readme.action === "create-repo";
    const message = t("confirm", { parts: names }) + (createsRepo ? `\n\n${t("confirmCreateRepo", { login })}` : "");
    if (!window.confirm(message)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const details: Record<ApplyPart, ReactNode> = {
    profile: <ProfileChanges plan={plan} />,
    social: <SocialChanges plan={plan} />,
    readme: <ReadmeChanges plan={plan} login={login} blocked={readmeBlocked} />,
  };

  return (
    <div className="flex flex-col gap-6">
      {state.status === "done" && state.results.length > 0 && <ApplyResults results={state.results} login={login} />}
      {(state.status === "stale" || state.status === "error") && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className={alertBox}>
            {t(`errors.${state.status === "error" ? state.reason : state.status}`)}
          </p>
          {/* Re-reads GitHub and the draft so the review is current again. */}
          <button type="button" onClick={() => router.refresh()} className={secondaryButton}>
            {t("reload")}
          </button>
        </div>
      )}
      <p role="status" className="sr-only">{isPending ? t("applying") : ""}</p>

      <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-6">
        {APPLY_PARTS.map((part) => {
          const changed = partHasChanges(plan, part);
          return (
            <section key={part} aria-labelledby={`part-${part}`} className={SECTION_CLASS}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id={`part-${part}`} className="text-lg font-semibold">{t(`parts.${part}`)}</h2>
                {changed && (
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" name={`part.${part}`} checked={selectedParts.includes(part)} disabled={!canApply(part)}
                      onChange={(event) => toggle(part, event.target.checked)} className="size-5 accent-accent"
                      aria-describedby={part === "readme" && readmeBlocked ? "readme-blocked" : undefined} />
                    {t("include")}
                    <span className="sr-only">: {t(`parts.${part}`)}</span>
                  </label>
                )}
              </div>
              <input type="hidden" name={`fingerprint.${part}`} value={fingerprints[part]} />
              {changed ? details[part] : <p className="text-sm text-muted">{t("noChanges")}</p>}
            </section>
          );
        })}

        <p className="text-sm text-muted">{t("limits")}</p>

        {anythingToApply ? (
          <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
            {isPending ? t("applying") : t("submit")}
          </button>
        ) : (
          <p className="text-sm">{t("nothingToApply")}</p>
        )}
        {(noneSelected || state.status === "nothingSelected") && (
          <p role="alert" className={alertBox}>{t("errors.nothingSelected")}</p>
        )}
      </form>
    </div>
  );
}
