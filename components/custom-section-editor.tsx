"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MAX_TECHNOLOGIES, type ReadmeLanguage } from "@/lib/readme/config";
import { CUSTOM_SECTION_MAX_LENGTH, type CustomSection, type SectionContent } from "@/lib/readme/custom-sections";
import { README_STRINGS } from "@/lib/readme/strings";
import { CharCount } from "./char-count";
import { INPUT_CLASS } from "./form-styles";
import { OptionalTitleField } from "./optional-title-field";
import { TECHNOLOGIES_BY_CATEGORY, TechnologyCheckboxes } from "./technology-checkboxes";

/**
 * Text and technologies of a section: a custom one or the fixed "Technologies".
 * The fields have no `name`: the parent sends the content as JSON.
 */
export function SectionContentFields<T extends SectionContent>(props: {
  /** Unique id prefix for the fields. */
  prefix: string;
  content: T;
  language: ReadmeLanguage;
  onChange: (change: (content: T) => T) => void;
  /** Starts with the technology list open. */
  isOpen?: boolean;
}) {
  const t = useTranslations("readmeEditor.custom");
  const tCategories = useTranslations("readmeEditor.technologies.categories");
  const tTechnologies = useTranslations("readmeEditor.technologies");
  const tHeadings = useTranslations("readmeEditor.headings");
  const { prefix, content, onChange } = props;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefix}-text`} className="text-sm font-medium">{t("text")}</label>
        <textarea id={`${prefix}-text`} rows={3} value={content.text} maxLength={CUSTOM_SECTION_MAX_LENGTH.text}
          aria-describedby={`${prefix}-text-hint`} className={INPUT_CLASS}
          onChange={(event) => onChange((c) => ({ ...c, text: event.target.value }))} />
        <div className="flex items-start justify-between gap-3">
          <p id={`${prefix}-text-hint`} className="text-sm text-muted">{t("textHint")}</p>
          <CharCount length={content.text.length} max={CUSTOM_SECTION_MAX_LENGTH.text} />
        </div>
      </div>

      <details open={props.isOpen} className="rounded-lg border border-border p-3">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">
          {t("technologies", { count: content.technologies.length, max: MAX_TECHNOLOGIES })}
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={content.groupByCategory}
              onChange={(event) => onChange((c) => ({ ...c, groupByCategory: event.target.checked }))}
              className="size-5 accent-accent" />
            <span className="text-sm">{t("groupByCategory")}</span>
          </label>
          {TECHNOLOGIES_BY_CATEGORY.map(({ category }) => (
            <div key={category} className="flex flex-col gap-2">
              <p id={`${prefix}-tech-${category}`} className="text-sm font-semibold">{tCategories(category)}</p>
              {content.groupByCategory && (
                <OptionalTitleField id={`${prefix}-category-${category}`} label={tHeadings("categoryTitle")}
                  owner={tCategories(category)} recommended={README_STRINGS[props.language].categories[category]}
                  value={content.categoryTitles[category]} maxLength={CUSTOM_SECTION_MAX_LENGTH.title}
                  onChange={(title) => onChange((c) => ({ ...c, categoryTitles: { ...c.categoryTitles, [category]: title } }))} />
              )}
              <TechnologyCheckboxes category={category} labelledBy={`${prefix}-tech-${category}`}
                selected={content.technologies}
                onChange={(next) => onChange((c) => ({ ...c, technologies: next }))} />
            </div>
          ))}
          <p className="text-xs text-muted">{tTechnologies("attribution")}</p>
        </div>
      </details>
    </>
  );
}

/** A section the user created: optional title, text and technologies. */
export function CustomSectionEditor(props: {
  section: CustomSection;
  /** README language, for the recommended category titles. */
  language: ReadmeLanguage;
  /** Accessible name when the section has no title yet ("Custom section 2"). */
  fallbackName: string;
  onChange: (change: (section: CustomSection) => CustomSection) => void;
  onRemove: () => void;
  controls: ReactNode;
}) {
  const t = useTranslations("readmeEditor.custom");
  const { section, onChange } = props;
  const prefix = `custom-${section.id}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-h-11 items-center font-medium">{section.title || props.fallbackName}</span>
        <div className="flex flex-wrap gap-2">
          {props.controls}
          <button type="button" onClick={props.onRemove}
            aria-label={t("removeLabel", { name: section.title || props.fallbackName })}
            className="min-h-11 rounded-lg border border-border-strong px-3 text-sm font-medium text-red-700 dark:text-red-400">
            {t("remove")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefix}-title`} className="text-sm font-medium">{t("title")}</label>
        <input id={`${prefix}-title`} type="text" value={section.title} placeholder={t("titlePlaceholder")}
          maxLength={CUSTOM_SECTION_MAX_LENGTH.title} aria-describedby={`${prefix}-title-hint`} className={INPUT_CLASS}
          onChange={(event) => onChange((s) => ({ ...s, title: event.target.value }))} />
        <div className="flex items-start justify-between gap-3">
          <p id={`${prefix}-title-hint`} className="text-sm text-muted">{t("titleHint")}</p>
          <CharCount length={section.title.length} max={CUSTOM_SECTION_MAX_LENGTH.title} />
        </div>
      </div>

      <SectionContentFields prefix={prefix} content={section} language={props.language} onChange={onChange} />
    </>
  );
}
