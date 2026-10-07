"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { saveDraftAction, type SaveDraftState } from "@/app/drafts/actions";
import { cleanText, MAX_SOCIAL_ACCOUNTS, type DraftProfile, type FieldErrors } from "@/lib/drafts/content";
import { singleLine, type DraftReadme } from "@/lib/readme/config";
import { generateReadme } from "@/lib/readme/generate";
import { primaryButton, secondaryButton } from "./button-styles";
import { ProfileFields, TextField, type ProfileValues } from "./profile-fields";
import { ProfilePreview } from "./profile-preview";
import { ReadmePreview } from "./readme-preview";
import { ReadmeSettings, type RepositoryOption } from "./readme-settings";

type EditorValues = { title: string; profile: ProfileValues; social: string[]; readme: DraftReadme };
type Tab = "profile" | "readme";
const TABS: Tab[] = ["profile", "readme"];
// Shared empty object keeps memoized values stable when there are no errors.
const NO_ERRORS: FieldErrors = {};

function toEditorValues(title: string, profile: DraftProfile, readme: DraftReadme): EditorValues {
  const { socialAccounts, ...rest } = profile;
  const social = Array.from({ length: MAX_SOCIAL_ACCOUNTS }, (_, i) => socialAccounts[i] ?? "");
  return { title, profile: rest, social, readme };
}

// Same normalization the server applies on save (cleanText, no leading @), so
// the previews show exactly what will be saved and published.
function toPreviewProfile(values: EditorValues): DraftProfile {
  const p = values.profile;
  return {
    name: cleanText(p.name),
    bio: cleanText(p.bio),
    location: cleanText(p.location),
    company: cleanText(p.company),
    blog: cleanText(p.blog),
    twitterUsername: cleanText(p.twitterUsername).replace(/^@/, ""),
    email: cleanText(p.email),
    hireable: p.hireable,
    socialAccounts: values.social.map(cleanText).filter(Boolean),
  };
}

function toPreviewReadme(readme: DraftReadme): DraftReadme {
  return {
    ...readme,
    greeting: singleLine(cleanText(readme.greeting)),
    intro: cleanText(readme.intro),
  };
}

/** Tab holding the first error, so focus can reach it. */
function tabWithErrors(errors: FieldErrors): Tab | null {
  const fields = Object.keys(errors).filter((field) => field !== "title");
  if (fields.length === 0) return null;
  return fields.every((field) => field.startsWith("readme.")) ? "readme" : "profile";
}

function SaveStatus(props: { state: SaveDraftState; isDirty: boolean; isPending: boolean; hasVisibleErrors: boolean }) {
  const { state, isDirty, isPending } = props;
  const t = useTranslations("draftEditor");
  const errorMessages: Partial<Record<SaveDraftState["status"], string>> = {
    // Hidden once every highlighted field was edited.
    invalid: props.hasVisibleErrors ? t("errors.form") : undefined,
    failed: t("errors.failed"),
    notFound: t("errors.notFound"),
  };
  const error = isPending ? undefined : errorMessages[state.status];
  const status = isPending ? t("saving") : isDirty ? t("unsaved") : state.status === "saved" ? t("saved") : "";

  // The polite live region is always rendered so screen readers announce text
  // changes in it; failures interrupt with role="alert".
  return (
    <>
      <p role="status" aria-live="polite" className="text-sm text-muted">{error ? "" : status}</p>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </>
  );
}

export function DraftEditor(props: {
  id: string;
  title: string;
  profile: DraftProfile;
  readme: DraftReadme;
  login: string;
  avatarUrl: string;
  verifiedEmails: string[] | null;
  repositories: RepositoryOption[] | null;
}) {
  const t = useTranslations("draftEditor");
  const tReadme = useTranslations("readmePreview");
  const tApply = useTranslations("apply");
  const [state, formAction, isPending] = useActionState(saveDraftAction.bind(null, props.id), { status: "idle" });
  const [values, setValues] = useState(() => toEditorValues(props.title, props.profile, props.readme));
  const [savedValues, setSavedValues] = useState(values);
  const [submittedValues, setSubmittedValues] = useState(values);
  const [handledState, setHandledState] = useState(state);
  // Fields edited since the last submit no longer show that submit's error.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const formRef = useRef<HTMLFormElement>(null);

  // On a new action result: a successful save makes what was submitted the
  // saved baseline, every field error becomes visible again, and the tab with
  // the errors is shown.
  if (state !== handledState) {
    setHandledState(state);
    setDismissed(new Set());
    if (state.status === "saved") setSavedValues(submittedValues);
    const errorTab = state.status === "invalid" ? tabWithErrors(state.errors) : null;
    if (errorTab) setActiveTab(errorTab);
  }

  const isDirty = JSON.stringify(values) !== JSON.stringify(savedValues);
  const visibleErrors = state.status === "invalid" && !isPending ? state.errors : NO_ERRORS;
  const errors: FieldErrors = Object.fromEntries(
    Object.entries(visibleErrors).filter(([field]) => !field.startsWith("readme.") && !dismissed.has(field)),
  );
  // A README error hides once its field differs from what was submitted.
  // Memoized so the heavy README panel only re-renders when README data changes.
  const readmeErrors = useMemo<FieldErrors>(
    () =>
      Object.fromEntries(
        Object.entries(visibleErrors).filter(([field]) => {
          if (!field.startsWith("readme.")) return false;
          const key = field.slice("readme.".length) as keyof DraftReadme;
          return JSON.stringify(values.readme[key]) === JSON.stringify(submittedValues.readme[key]);
        }),
      ),
    [visibleErrors, values.readme, submittedValues.readme],
  );

  // Move keyboard/screen-reader focus to the first visible invalid field.
  useEffect(() => {
    if (state.status !== "invalid") return;
    formRef.current?.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden]) [aria-invalid="true"], #title[aria-invalid="true"]')?.focus();
  }, [state]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = ""; // older browsers
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  // In-app navigation (any link on the page, including the header, and forms
  // marked data-leaves-page such as "Sign out") does not fire beforeunload,
  // so ask before leaving with unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const message = t("confirmDiscard");
    const onClick = (event: globalThis.MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin) return;
      if (anchor.getAttribute("href")?.startsWith("#")) return; // in-page links (e.g. skip link)
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      if (form.dataset.leavesPage !== undefined && !window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [isDirty, t]);

  const dismiss = (field: string) =>
    setDismissed((current) => (current.has(field) ? current : new Set(current).add(field)));

  const setProfileField = (field: keyof ProfileValues, value: string | boolean) => {
    dismiss(field);
    setValues((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
  };

  const setSocial = (index: number, value: string) => {
    dismiss("socialAccounts");
    setValues((v) => ({ ...v, social: v.social.map((s, i) => (i === index ? value : s)) }));
  };

  const previewProfile = useMemo(() => toPreviewProfile(values), [values]);
  // Same generator used when publishing; only run while the README tab is open.
  const readmeOutput = useMemo(
    () =>
      activeTab === "readme"
        ? generateReadme({
            readme: toPreviewReadme(values.readme),
            profile: previewProfile,
            login: props.login,
            repositories: props.repositories ?? [],
          })
        : null,
    [activeTab, values.readme, previewProfile, props.login, props.repositories],
  );

  // Stable identity so the memoized README panel skips unrelated re-renders.
  const updateReadme = useCallback((change: (current: DraftReadme) => DraftReadme) => {
    setValues((current) => ({ ...current, readme: change(current.readme) }));
  }, []);

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const next = activeTab === "profile" ? "readme" : "profile";
    setActiveTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  // onSubmit instead of <form action>: React resets uncontrolled forms after an action.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmittedValues(values);
    startTransition(() => formAction(formData));
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/drafts" className="inline-flex min-h-11 items-center self-start text-sm text-muted underline-offset-4 hover:underline">
        <span aria-hidden="true">←</span>&nbsp;{t("back")}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight break-words">{savedValues.title}</h1>

      {/* The README preview needs room: both columns share the width on that tab. */}
      <div
        className={`grid gap-10 lg:gap-12 ${
          activeTab === "readme" ? "lg:grid-cols-2" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
        }`}
      >
        {/* method="post" keeps field values out of the URL if submitted before hydration. */}
        <form ref={formRef} method="post" onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
          <TextField
            name="title"
            value={values.title}
            onChange={(title) => {
              dismiss("title");
              setValues((v) => ({ ...v, title }));
            }}
            error={errors.title}
            hint={t("hints.title")}
          />

          <div role="tablist" aria-label={t("tabs.label")} className="flex gap-1 border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab}
                id={`tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={handleTabKey}
                className="-mb-px min-h-11 border-b-2 border-transparent px-4 text-sm font-medium text-muted aria-selected:border-accent aria-selected:text-foreground"
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>

          {/* Both panels stay in the form so one save covers profile and README. */}
          <div id="panel-profile" role="tabpanel" aria-labelledby="tab-profile" hidden={activeTab !== "profile"}>
            <ProfileFields
              profile={values.profile}
              social={values.social}
              errors={errors}
              verifiedEmails={props.verifiedEmails}
              setField={setProfileField}
              setSocial={setSocial}
            />
          </div>
          <div id="panel-readme" role="tabpanel" aria-labelledby="tab-readme" hidden={activeTab !== "readme"}>
            <ReadmeSettings
              login={props.login}
              value={values.readme}
              update={updateReadme}
              errors={readmeErrors}
              repositories={props.repositories}
            />
          </div>

          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isPending} className={primaryButton}>
                {isPending ? t("saving") : t("save")}
              </button>
              {/* Applying always uses the saved draft, so unsaved edits block it. */}
              {isDirty ? (
                <button type="button" aria-disabled="true" aria-describedby="apply-hint" className={`${secondaryButton} cursor-not-allowed opacity-60`}>
                  {tApply("open")}
                </button>
              ) : (
                <Link href={`/drafts/${props.id}/apply`} className={secondaryButton}>
                  {tApply("open")}
                </Link>
              )}
            </div>
            <SaveStatus
              state={state}
              isDirty={isDirty}
              isPending={isPending}
              hasVisibleErrors={Object.keys(errors).length + Object.keys(readmeErrors).length > 0}
            />
            {isDirty && <p id="apply-hint" className="text-sm text-muted">{tApply("saveFirst")}</p>}
          </div>
        </form>

        <aside aria-labelledby="preview-title" className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          {activeTab === "readme" && readmeOutput ? (
            <>
              <div className="flex flex-col gap-1">
                <h2 id="preview-title" className="text-lg font-semibold">{tReadme("title")}</h2>
                <p className="text-sm text-muted">{tReadme("note")}</p>
              </div>
              <ReadmePreview markdown={readmeOutput.markdown} missingProjects={readmeOutput.missingProjects} />
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h2 id="preview-title" className="text-lg font-semibold">{t("preview.title")}</h2>
                <p className="text-sm text-muted">{t("preview.note")}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-5">
                <ProfilePreview login={props.login} avatarUrl={props.avatarUrl} profile={previewProfile} />
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
