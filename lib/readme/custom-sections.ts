import { findTechnology, MAX_TECHNOLOGIES, TECHNOLOGY_CATEGORIES, type TechnologyCategory } from "./technologies";
import { MOVABLE_SECTION_IDS, TEMPLATES, type MovableSectionId, type TemplateId } from "./templates";

// Sections the user creates ("Studying", "Skills", ...): an optional title,
// optional Markdown text and optional technologies from the catalog, shown in
// one list or grouped by category. They are ordered together with the fixed
// sections, as "custom:<id>" entries in the draft's order. The fixed
// "Technologies" section has the same content (SectionContent).

/** Text and technologies: the content of a custom section and of the fixed "Technologies" one. */
export type SectionContent = {
  /** User Markdown, like the introduction. */
  text: string;
  /** Technology catalog ids, in selection order. */
  technologies: string[];
  /** Grouped under the category titles (Languages, Frameworks...) or one list. */
  groupByCategory: boolean;
  /**
   * Category titles used when grouped: custom text, "" for the recommended
   * title in the README language, or null for no title.
   */
  categoryTitles: Record<TechnologyCategory, string | null>;
};

export type CustomSection = SectionContent & {
  id: string;
  /** Single line; empty means no title. */
  title: string;
};

export function emptyCategoryTitles(): Record<TechnologyCategory, string | null> {
  return Object.fromEntries(TECHNOLOGY_CATEGORIES.map((category) => [category, ""])) as Record<TechnologyCategory, string | null>;
}

export function emptyContent(groupByCategory: boolean): SectionContent {
  return { text: "", technologies: [], groupByCategory, categoryTitles: emptyCategoryTitles() };
}

export function newCustomSection(id: string): CustomSection {
  return { id, title: "", ...emptyContent(false) };
}

export type CustomSectionKey = `custom:${string}`;
/** One entry of the draft's section order (the greeting is always first, outside it). */
export type SectionKey = MovableSectionId | CustomSectionKey;

export const MAX_CUSTOM_SECTIONS = 5;
export const CUSTOM_SECTION_MAX_LENGTH = { title: 60, text: 1000 } as const;
const ID_PATTERN = /^[a-z0-9]{1,16}$/;

export function customSectionKey(id: string): CustomSectionKey {
  return `custom:${id}`;
}

export function customSectionId(key: SectionKey): string | null {
  return key.startsWith("custom:") ? key.slice("custom:".length) : null;
}

/** A short random id for a new section (client side). */
export function newCustomSectionId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export type SectionContentError = { code: "tooMany"; max: number } | { code: "tooLong"; max: number } | { code: "invalidOption" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function technologyIds(value: unknown): string[] {
  const ids = Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  return [...new Set(ids)];
}

// Postgres rejects NUL in jsonb, and the editor sends "\r\n" line breaks.
function plainText(value: unknown): string {
  return typeof value === "string" ? value.replaceAll("\0", "").replace(/\r\n?/g, "\n").trim() : "";
}

function readContent(raw: Record<string, unknown>): SectionContent {
  return {
    text: plainText(raw.text),
    technologies: technologyIds(raw.technologies),
    groupByCategory: raw.groupByCategory === true,
    categoryTitles: Object.fromEntries(
      TECHNOLOGY_CATEGORIES.map((category) => {
        const value = isRecord(raw.categoryTitles) ? raw.categoryTitles[category] : undefined;
        return [category, value === null ? null : plainText(value).replace(/\s*\n\s*/g, " ")];
      }),
    ) as Record<TechnologyCategory, string | null>,
  };
}

function readSection(raw: Record<string, unknown>): CustomSection {
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    title: plainText(raw.title).replace(/\s*\n\s*/g, " "),
    ...readContent(raw),
  };
}

/** Content cut to the limits, with technologies no longer in the catalog left out. */
function trimContent(content: SectionContent): SectionContent {
  return {
    ...content,
    text: content.text.slice(0, CUSTOM_SECTION_MAX_LENGTH.text),
    technologies: content.technologies.filter((id) => findTechnology(id)).slice(0, MAX_TECHNOLOGIES),
    categoryTitles: Object.fromEntries(
      Object.entries(content.categoryTitles).map(([category, title]) => [category, title?.slice(0, CUSTOM_SECTION_MAX_LENGTH.title) ?? null]),
    ) as Record<TechnologyCategory, string | null>,
  };
}

function contentError(content: SectionContent, extraTitles: string[] = []): SectionContentError | undefined {
  const titles = [...extraTitles, ...Object.values(content.categoryTitles)];
  if (titles.some((title) => (title?.length ?? 0) > CUSTOM_SECTION_MAX_LENGTH.title)) {
    return { code: "tooLong", max: CUSTOM_SECTION_MAX_LENGTH.title };
  }
  if (content.text.length > CUSTOM_SECTION_MAX_LENGTH.text) return { code: "tooLong", max: CUSTOM_SECTION_MAX_LENGTH.text };
  if (content.technologies.length > MAX_TECHNOLOGIES) return { code: "tooMany", max: MAX_TECHNOLOGIES };
  if (content.technologies.some((id) => !findTechnology(id))) return { code: "invalidOption" };
  return undefined;
}

/** Stored content of the "Technologies" section (lenient). */
export function normalizeSectionContent(raw: unknown, fallback: SectionContent): SectionContent {
  return isRecord(raw) ? trimContent(readContent(raw)) : fallback;
}

/** Editor form value (JSON) of the "Technologies" section: strict. */
export function parseSectionContent(json: string, fallback: SectionContent): { value: SectionContent; error?: SectionContentError } {
  if (!json) return { value: fallback };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { value: fallback, error: { code: "invalidOption" } };
  }
  if (!isRecord(raw)) return { value: fallback, error: { code: "invalidOption" } };
  const value = readContent(raw);
  return { value, error: contentError(value) };
}

/** Stored sections with known fields and valid values only (lenient: drops what is invalid). */
export function normalizeCustomSections(raw: unknown): CustomSection[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const sections: CustomSection[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const section = readSection(item);
    if (!ID_PATTERN.test(section.id) || seen.has(section.id)) continue;
    seen.add(section.id);
    sections.push({ ...trimContent(section), id: section.id, title: section.title.slice(0, CUSTOM_SECTION_MAX_LENGTH.title) });
    if (sections.length === MAX_CUSTOM_SECTIONS) break;
  }
  return sections;
}

/** Editor form value (JSON): strict, so a bad value is reported instead of silently changed. */
export function parseCustomSections(json: string): { value: CustomSection[]; error?: SectionContentError } {
  if (!json) return { value: [] };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { value: [], error: { code: "invalidOption" } };
  }
  if (!Array.isArray(raw) || !raw.every(isRecord)) return { value: [], error: { code: "invalidOption" } };
  const value = raw.map(readSection);
  if (value.length > MAX_CUSTOM_SECTIONS) return { value, error: { code: "tooMany", max: MAX_CUSTOM_SECTIONS } };

  const ids = value.map((section) => section.id);
  if (ids.some((id) => !ID_PATTERN.test(id)) || new Set(ids).size !== ids.length) {
    return { value, error: { code: "invalidOption" } };
  }
  for (const section of value) {
    const error = contentError(section, [section.title]);
    if (error) return { value, error };
  }
  return { value };
}

/** True when `order` lists every fixed section and every custom section exactly once. */
export function isSectionOrder(order: readonly string[], sections: readonly CustomSection[]): order is SectionKey[] {
  const expected = [...MOVABLE_SECTION_IDS, ...sections.map((section) => customSectionKey(section.id))];
  return order.length === expected.length && new Set(order).size === order.length && expected.every((key) => order.includes(key));
}

/**
 * A complete order from a stored one: known entries keep their place, missing
 * fixed sections follow in the template's order and missing custom ones at the end.
 * Drafts saved before sections could be reordered get their template's order.
 */
export function completeOrder(stored: unknown, template: TemplateId, sections: readonly CustomSection[]): SectionKey[] {
  const known = new Set<string>([...MOVABLE_SECTION_IDS, ...sections.map((section) => customSectionKey(section.id))]);
  const kept = Array.isArray(stored)
    ? [...new Set(stored.filter((key): key is SectionKey => typeof key === "string" && known.has(key)))]
    : [];
  const missing = [...TEMPLATES[template].defaultOrder, ...sections.map((section) => customSectionKey(section.id))]
    .filter((key) => !kept.includes(key));
  return [...kept, ...missing];
}
