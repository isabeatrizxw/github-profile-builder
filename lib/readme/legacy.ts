import type { ReadmeLanguage } from "./config";
import { README_STRINGS } from "./strings";
import { TECHNOLOGY_CATEGORIES } from "./technologies";
import type { TemplateId } from "./templates";

// Upgrades README settings saved in older shapes (drafts and README markers),
// so the generated README keeps the same content:
// 1. Before 2026-10-07: technologies as a plain list with global category
//    titles. They become the "Technologies" section content.
// 2. 2026-10-07 (briefly): technologies as a custom section with id
//    "technologies". It moves back into the "Technologies" section.
// 3. Before 2026-10-07: separate "intro" and "about" sections. They become one
//    introduction; the "About me" title, when shown, stays inside its text.

// Section order of each template while "about" existed.
const LEGACY_ORDER: Record<TemplateId, string[]> = {
  classic: ["intro", "about", "technologies", "projects", "contact"],
  minimal: ["intro", "about", "technologies", "projects", "contact"],
  compact: ["intro", "technologies", "projects", "about", "contact"],
};

const INTERIM_ID = "technologies";

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Returns the stored settings in the current shape (a new object; `stored` is not changed). */
export function upgradeLegacyReadme(
  stored: Record<string, unknown>,
  template: TemplateId,
  language: ReadmeLanguage,
): Record<string, unknown> {
  const { technologies, about, ...next } = stored;
  const headings = { ...record(stored.headings) };
  const sections = { ...record(stored.sections) };
  let order: unknown[] | undefined = Array.isArray(stored.order) ? [...stored.order] : undefined;
  let customSections: unknown[] = Array.isArray(stored.customSections) ? stored.customSections : [];

  // 1. Plain technology list.
  if (Array.isArray(technologies) && next.stack === undefined) {
    next.stack = {
      text: "",
      technologies,
      // The compact template showed every icon in one row; the others grouped them.
      groupByCategory: template !== "compact",
      // null (a hidden title) must stay null; only a missing title becomes the recommended one.
      categoryTitles: Object.fromEntries(
        TECHNOLOGY_CATEGORIES.map((category) => [category, headings[category] === undefined ? "" : headings[category]]),
      ),
    };
    order ??= LEGACY_ORDER[template];
  }

  // 2. Interim custom section.
  const interim = customSections.map(record).find((section) => section.id === INTERIM_ID);
  if (interim && next.stack === undefined) {
    next.stack = interim;
    headings.technologies = text(interim.title) || null;
    customSections = customSections.filter((section) => record(section).id !== INTERIM_ID);
    order = order?.map((key) => (key === `custom:${INTERIM_ID}` ? "technologies" : key));
  }

  // 3. Separate introduction and "About me".
  if (typeof about === "string") {
    const aboutTitle = headings.about === null
      ? null
      : text(headings.about) || README_STRINGS[language].headings.intro;
    const introOn = sections.intro !== false && text(stored.intro) !== "";
    const aboutOn = sections.about !== false && text(about) !== "";
    const parts = [
      introOn ? text(stored.intro) : "",
      aboutOn ? (aboutTitle === null ? text(about) : `## ${aboutTitle}\n\n${text(about)}`) : "",
    ].filter(Boolean);
    next.intro = parts.join("\n\n");
    // With nothing to show, keep the switch as it was, so typed text appears later.
    sections.intro = parts.length > 0 || sections.intro !== false;
    headings.intro = null;
    order = (order ?? LEGACY_ORDER[template]).filter((key) => key !== "about");
  }

  return { ...next, headings, sections, customSections, ...(order ? { order } : {}) };
}
