"use client";

import { memo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { FieldError, FieldErrors } from "@/lib/drafts/content";
import {
  CONTACT_STYLES,
  MAX_PROJECTS,
  README_LANGUAGES,
  README_MAX_LENGTH,
  type DraftReadme,
  type HeadingId,
  templateOrder,
} from "@/lib/readme/config";
import {
  customSectionId,
  customSectionKey,
  MAX_CUSTOM_SECTIONS,
  newCustomSection,
  newCustomSectionId,
  type CustomSection,
  type SectionKey,
} from "@/lib/readme/custom-sections";
import type { ReadmeProject } from "@/lib/readme/generate";
import { README_STRINGS } from "@/lib/readme/strings";
import { TEMPLATE_IDS, type SectionId } from "@/lib/readme/templates";
import { CharCount } from "./char-count";
import { CustomSectionEditor, SectionContentFields } from "./custom-section-editor";
import { ERROR_CLASS, INPUT_CLASS, OPTION_CLASS, useErrorMessage } from "./form-styles";
import { OptionalTitleField } from "./optional-title-field";
import { toggleItem as toggle } from "./technology-checkboxes";

/** A repository the user can pick; also the real data the README generator uses. */
export type RepositoryOption = ReadmeProject & { isFork: boolean; isArchived: boolean };

type Update = (change: (current: DraftReadme) => DraftReadme) => void;

const LEGEND_CLASS = "mb-2 text-lg font-semibold";

function ErrorText({ id, error }: { id: string; error?: FieldError }) {
  const errorMessage = useErrorMessage();
  return error ? <p id={id} className={ERROR_CLASS}>{errorMessage(error)}</p> : null;
}

function TemplatePicker({ value, update }: { value: DraftReadme; update: Update }) {
  const t = useTranslations("readmeEditor.template");
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={LEGEND_CLASS}>{t("legend")}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {TEMPLATE_IDS.map((id) => (
          <label key={id} className={OPTION_CLASS}>
            <input type="radio" name="readme.template" value={id} checked={value.template === id}
              onChange={() => update((r) => ({ ...r, template: id }))} className="mt-1 accent-accent" />
            <span className="flex flex-col gap-1">
              <span className="font-medium">{t(`${id}.name`)}</span>
              <span className="text-sm text-muted">{t(`${id}.description`)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function LanguagePicker({ value, update }: { value: DraftReadme; update: Update }) {
  const t = useTranslations("readmeEditor.language");
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby="readme-language-hint">
      <legend className={LEGEND_CLASS}>{t("legend")}</legend>
      <p id="readme-language-hint" className="text-sm text-muted">{t("hint")}</p>
      <div className="flex flex-wrap gap-2">
        {README_LANGUAGES.map((language) => (
          <label key={language} lang={language} className={`${OPTION_CLASS} items-center`}>
            <input type="radio" name="readme.language" value={language} checked={value.language === language}
              onChange={() => update((r) => ({ ...r, language }))} className="accent-accent" />
            {t(language)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SectionText(props: {
  field: "greeting" | "intro";
  value: DraftReadme;
  update: Update;
  errors: FieldErrors;
  hint: string;
}) {
  const t = useTranslations("readmeEditor.fields");
  const { field } = props;
  const id = `readme-${field}`;
  const error = props.errors[`readme.${field}`];
  const common = {
    id,
    name: `readme.${field}`,
    value: props.value[field],
    maxLength: README_MAX_LENGTH[field],
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [`${id}-hint`, error && `${id}-error`].filter(Boolean).join(" "),
    className: INPUT_CLASS,
    onChange: (event: { target: { value: string } }) =>
      props.update((r) => ({ ...r, [field]: event.target.value })),
  };
  return (
    <div className="flex flex-col gap-1.5 pl-8">
      <label htmlFor={id} className="text-sm font-medium">{t(field)}</label>
      {field === "intro" ? <textarea rows={5} {...common} /> : <input type="text" {...common} />}
      <div className="flex items-start justify-between gap-3">
        <p id={`${id}-hint`} className="text-sm text-muted">{props.hint}</p>
        <CharCount length={props.value[field].length} max={README_MAX_LENGTH[field]} />
      </div>
      <ErrorText id={`${id}-error`} error={error} />
    </div>
  );
}

/** A fixed section's optional title; hidden inputs carry its state in the form. */
function HeadingField(props: { id: HeadingId; label: string; owner: string; fallback: string; value: DraftReadme; update: Update }) {
  const stored = props.value.headings[props.id];
  return (
    <div className="pl-8">
      <input type="hidden" name={`readme.heading.${props.id}`} value={stored ?? ""} />
      {stored === null && <input type="hidden" name={`readme.headingHidden.${props.id}`} value="on" />}
      <OptionalTitleField id={`readme-heading-${props.id}`} label={props.label} owner={props.owner}
        recommended={props.fallback} value={stored} maxLength={README_MAX_LENGTH.heading}
        onChange={(heading) => props.update((r) => ({ ...r, headings: { ...r.headings, [props.id]: heading } }))} />
    </div>
  );
}

function ContactStylePicker({ value, update }: { value: DraftReadme; update: Update }) {
  const t = useTranslations("readmeEditor.contactStyle");
  return (
    <fieldset className="flex flex-col gap-2 pl-8">
      <legend className="mb-1 text-sm font-medium">{t("legend")}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {CONTACT_STYLES.map((style) => (
          <label key={style} className={OPTION_CLASS}>
            <input type="radio" name="readme.contactStyle" value={style} checked={value.contactStyle === style}
              onChange={() => update((r) => ({ ...r, contactStyle: style }))} className="mt-1 accent-accent" />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t(`${style}.name`)}</span>
              <span className="text-sm text-muted">{t(`${style}.description`)}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">{t("attribution")}</p>
    </fieldset>
  );
}

/** One section: on/off switch, optional title and text fields, plus `controls` for reordering. */
function SectionBlock(props: {
  section: SectionId;
  value: DraftReadme;
  update: Update;
  errors: FieldErrors;
  repositories: RepositoryOption[] | null;
  controls?: ReactNode;
}) {
  const t = useTranslations("readmeEditor");
  const { section, value, update } = props;
  const hints = {
    greeting: t("hints.greeting"),
    intro: t("hints.intro", { max: README_MAX_LENGTH.intro }),
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name={`readme.section.${section}`} checked={value.sections[section]}
            onChange={(event) => update((r) => ({ ...r, sections: { ...r.sections, [section]: event.target.checked } }))}
            className="size-5 accent-accent" />
          <span className="font-medium">{t(`sections.${section}`)}</span>
        </label>
        {props.controls}
      </div>
      {section !== "greeting" && (
        <HeadingField id={section} label={t("headings.title")} owner={t(`sections.${section}`)} fallback={README_STRINGS[value.language].headings[section]}
          value={value} update={update} />
      )}
      {(section === "greeting" || section === "intro") && (
        <SectionText field={section} value={value} update={update} errors={props.errors} hint={hints[section]} />
      )}
      {section === "technologies" && (
        <div className="flex flex-col gap-4 pl-8">
          <input type="hidden" name="readme.stack" value={JSON.stringify(value.stack)} />
          <SectionContentFields prefix="readme-stack" content={value.stack} language={value.language} isOpen
            onChange={(change) => update((r) => ({ ...r, stack: change(r.stack) }))} />
          <ErrorText id="readme-stack-error" error={props.errors["readme.stack"]} />
        </div>
      )}
      {section === "projects" && (
        <div className="pl-8">
          <ProjectPicker value={value} update={update} errors={props.errors} repositories={props.repositories} />
        </div>
      )}
      {section === "contact" && (
        <>
          <p className="pl-8 text-sm text-muted">{t("hints.contact")}</p>
          <ContactStylePicker value={value} update={update} />
        </>
      )}
    </>
  );
}

function moveSection(order: SectionKey[], index: number, offset: -1 | 1): SectionKey[] {
  const target = index + offset;
  if (target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const MOVE_BUTTON_CLASS =
  "flex size-11 items-center justify-center rounded-lg border border-border-strong bg-surface text-lg aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

function updateCustomSection(r: DraftReadme, id: string, change: (section: CustomSection) => CustomSection): DraftReadme {
  return { ...r, customSections: r.customSections.map((section) => (section.id === id ? change(section) : section)) };
}

function SectionsPicker({ value, update, errors, repositories }: {
  value: DraftReadme;
  update: Update;
  errors: FieldErrors;
  repositories: RepositoryOption[] | null;
}) {
  const t = useTranslations("readmeEditor.sections");
  const tCustom = useTranslations("readmeEditor.custom");
  const [announcement, setAnnouncement] = useState("");
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Custom sections stay where the user put them; only fixed sections are compared.
  const fixedOrder = value.order.filter((key) => customSectionId(key) === null);
  const isSuggestedOrder = templateOrder(value.template).every((id, index) => fixedOrder[index] === id);
  const isFull = value.customSections.length >= MAX_CUSTOM_SECTIONS;

  function sectionName(key: SectionKey): string {
    const id = customSectionId(key);
    if (id === null) return t(key as Exclude<SectionKey, `custom:${string}`>);
    const index = value.customSections.findIndex((section) => section.id === id);
    return value.customSections[index]?.title || tCustom("fallbackName", { number: index + 1 });
  }

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= value.order.length) return;
    update((r) => ({ ...r, order: moveSection(r.order, index, offset) }));
    setAnnouncement(t("moved", { section: sectionName(value.order[index]), position: target + 1, total: value.order.length }));
  }

  function resetOrder() {
    // Fixed sections go back to the template's order; custom ones keep their relative order at the end.
    update((r) => ({ ...r, order: [...templateOrder(r.template), ...r.order.filter((key) => customSectionId(key) !== null)] }));
    setAnnouncement(t("orderReset"));
  }

  function addSection() {
    if (isFull) return;
    const section = newCustomSection(newCustomSectionId());
    update((r) =>
      r.customSections.length >= MAX_CUSTOM_SECTIONS
        ? r
        : { ...r, customSections: [...r.customSections, section], order: [...r.order, customSectionKey(section.id)] },
    );
    setAnnouncement(tCustom("added"));
    // Move focus into the new section, which renders on the next frame.
    requestAnimationFrame(() => document.getElementById(`custom-${section.id}-title`)?.focus());
  }

  function removeSection(id: string) {
    const key = customSectionKey(id);
    update((r) => ({
      ...r,
      customSections: r.customSections.filter((section) => section.id !== id),
      order: r.order.filter((item) => item !== key),
    }));
    setAnnouncement(tCustom("removed", { name: sectionName(key) }));
    // The focused Remove button is gone: keep focus inside the section controls.
    addButtonRef.current?.focus();
  }

  function moveButtons(key: SectionKey, index: number) {
    // aria-disabled (not disabled) keeps keyboard focus on the button after a move.
    return (
      <div className="flex gap-2">
        <button type="button" aria-label={t("moveUp", { section: sectionName(key) })} aria-disabled={index === 0}
          onClick={() => move(index, -1)} className={MOVE_BUTTON_CLASS}>↑</button>
        <button type="button" aria-label={t("moveDown", { section: sectionName(key) })}
          aria-disabled={index === value.order.length - 1}
          onClick={() => move(index, 1)} className={MOVE_BUTTON_CLASS}>↓</button>
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-4" aria-describedby="readme-sections-hint">
      <legend className={LEGEND_CLASS}>{t("legend")}</legend>
      <p id="readme-sections-hint" className="text-sm text-muted">{t("hint")}</p>
      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <SectionBlock section="greeting" value={value} update={update} errors={errors} repositories={repositories}
          controls={<span className="text-sm text-muted">{t("fixedFirst")}</span>} />
      </div>
      <input type="hidden" name="readme.customSections" value={JSON.stringify(value.customSections)} />
      <ol className="flex flex-col gap-4">
        {value.order.map((key, index) => {
          const id = customSectionId(key);
          const custom = id === null ? undefined : value.customSections.find((section) => section.id === id);
          return (
            <li key={key} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <input type="hidden" name="readme.order" value={key} />
              {custom ? (
                <CustomSectionEditor section={custom} language={value.language}
                  fallbackName={tCustom("fallbackName", { number: value.customSections.indexOf(custom) + 1 })}
                  onChange={(change) => update((r) => updateCustomSection(r, custom.id, change))}
                  onRemove={() => removeSection(custom.id)} controls={moveButtons(key, index)} />
              ) : (
                <SectionBlock section={key as SectionId} value={value} update={update} errors={errors} repositories={repositories}
                  controls={moveButtons(key, index)} />
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        {/* aria-disabled keeps the button focusable, so focus can land here after a removal. */}
        <button ref={addButtonRef} type="button" onClick={addSection} aria-disabled={isFull}
          className="min-h-11 rounded-lg border border-border-strong px-4 text-sm font-medium aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
          {tCustom("add")}
        </button>
        <button type="button" disabled={isSuggestedOrder} onClick={resetOrder}
          className="min-h-11 rounded-lg border border-border-strong px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">
          {t("resetOrder")}
        </button>
      </div>
      <p className="text-sm text-muted">{tCustom("hint", { max: MAX_CUSTOM_SECTIONS, count: value.customSections.length })}</p>
      <ErrorText id="readme-order-error" error={errors["readme.order"]} />
      <ErrorText id="readme-custom-error" error={errors["readme.customSections"]} />
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </fieldset>
  );
}

function ProjectPicker(props: { value: DraftReadme; update: Update; errors: FieldErrors; repositories: RepositoryOption[] | null }) {
  const t = useTranslations("readmeEditor.projects");
  const { value, update } = props;
  const known = new Set((props.repositories ?? []).map((repo) => repo.fullName));
  // Saved projects that GitHub no longer lists stay visible so they can be unselected.
  const missing = value.projects.filter((name) => !known.has(name));
  const options: (RepositoryOption & { isMissing?: boolean })[] = [
    ...(props.repositories ?? []),
    ...missing.map((fullName) => ({
      fullName,
      name: fullName.split("/")[1] ?? fullName,
      description: null,
      htmlUrl: "",
      language: null,
      isFork: false,
      isArchived: false,
      isMissing: true,
    })),
  ];
  const isFull = value.projects.length >= MAX_PROJECTS;
  const error = props.errors["readme.projects"];

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? "readme-projects-hint readme-projects-error" : "readme-projects-hint"}>
      <legend className="mb-1 text-sm font-medium">{t("selected", { count: value.projects.length, max: MAX_PROJECTS })}</legend>
      <p id="readme-projects-hint" className="text-sm text-muted">
        {props.repositories === null ? t("unavailable") : t("hint", { max: MAX_PROJECTS })}
      </p>
      {props.repositories?.length === 0 && missing.length === 0 && <p className="text-sm text-muted">{t("empty")}</p>}
      <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
        {options.map((repo) => {
          const checked = value.projects.includes(repo.fullName);
          const badges = [repo.isFork && t("fork"), repo.isArchived && t("archived"), repo.isMissing && t("missing")].filter(Boolean);
          return (
            <li key={repo.fullName}>
              <label className={`${OPTION_CLASS} has-disabled:cursor-not-allowed has-disabled:opacity-50`}>
                <input type="checkbox" name="readme.projects" value={repo.fullName} checked={checked}
                  disabled={!checked && isFull}
                  onChange={(event) => update((r) => ({ ...r, projects: toggle(r.projects, repo.fullName, event.target.checked) }))}
                  className="mt-1 accent-accent" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="break-all font-medium">
                    {repo.fullName.split("/")[1]}
                    {badges.length > 0 && <span className="ml-2 text-xs font-normal text-muted">({badges.join(", ")})</span>}
                  </span>
                  {repo.description && <span className="text-sm text-muted">{repo.description}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <ErrorText id="readme-projects-error" error={error} />
    </fieldset>
  );
}

// Memoized: the editor re-renders on every keystroke in the profile fields, and
// this panel holds ~80 icons plus the repository list.
export const ReadmeSettings = memo(function ReadmeSettings(props: {
  login: string;
  value: DraftReadme;
  update: Update;
  errors: FieldErrors;
  repositories: RepositoryOption[] | null;
}) {
  const t = useTranslations("readmeEditor");
  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted">{t("intro", { login: props.login })}</p>
      <TemplatePicker value={props.value} update={props.update} />
      <LanguagePicker value={props.value} update={props.update} />
      <SectionsPicker value={props.value} update={props.update} errors={props.errors} repositories={props.repositories} />
    </div>
  );
});
