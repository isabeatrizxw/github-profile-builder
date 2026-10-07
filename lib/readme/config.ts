import {
  completeOrder,
  emptyContent,
  isSectionOrder,
  normalizeCustomSections,
  normalizeSectionContent,
  parseCustomSections,
  parseSectionContent,
  type CustomSection,
  type SectionContent,
  type SectionKey,
} from "./custom-sections";
import { upgradeLegacyReadme } from "./legacy";
import { MAX_TECHNOLOGIES } from "./technologies";
import {
  isTemplateId,
  SECTION_IDS,
  TEMPLATES,
  type MovableSectionId,
  type SectionId,
  type TemplateId,
} from "./templates";

export { MAX_TECHNOLOGIES };

export const README_LANGUAGES = ["pt-BR", "en"] as const;
export type ReadmeLanguage = (typeof README_LANGUAGES)[number];

/** Fixed section titles the user can rename or hide (custom sections hold their own). */
export const HEADING_IDS = ["intro", "technologies", "projects", "contact"] as const;
export type HeadingId = (typeof HEADING_IDS)[number];

/** How the contact links are shown: one per line, one line of text links, or icons. */
export const CONTACT_STYLES = ["list", "inline", "icons"] as const;
export type ContactStyle = (typeof CONTACT_STYLES)[number];

export function isContactStyle(value: unknown): value is ContactStyle {
  return typeof value === "string" && (CONTACT_STYLES as readonly string[]).includes(value);
}

/** The template's suggested section order, as a new array the draft can own. */
export function templateOrder(template: TemplateId): MovableSectionId[] {
  return [...TEMPLATES[template].defaultOrder];
}

/** README settings stored inside the draft content (jsonb). */
export type DraftReadme = {
  template: TemplateId;
  language: ReadmeLanguage;
  sections: Record<SectionId, boolean>;
  /** Order of every section after the greeting (which is always first), custom ones included. */
  order: SectionKey[];
  /** Sections the user created, up to MAX_CUSTOM_SECTIONS. */
  customSections: CustomSection[];
  contactStyle: ContactStyle;
  /** Empty means the template default ("Hi, I'm {name}"). */
  greeting: string;
  /** User Markdown: the introduction ("About me"). */
  intro: string;
  /** Content of the "Technologies" section: text and technologies, like a custom section. */
  stack: SectionContent;
  /** Full names ("owner/repo") of the user's own public repositories. */
  projects: string[];
  /**
   * Section titles: custom text, "" for the recommended title in
   * the README language (so it follows language changes), or null for no title.
   */
  headings: Record<HeadingId, string | null>;
};

export const README_MAX_LENGTH = { greeting: 100, intro: 1500, heading: 60 } as const;
export const MAX_PROJECTS = 6;

export type ReadmeFieldName =
  | "template" | "language" | "greeting" | "intro" | "projects" | "headings"
  | "order" | "contactStyle" | "customSections" | "stack";
export type ReadmeFieldError =
  | { code: "tooLong"; max: number }
  | { code: "tooMany"; max: number }
  | { code: "invalidOption" };
export type ReadmeFieldErrors = Partial<Record<ReadmeFieldName, ReadmeFieldError>>;

export function isReadmeLanguage(value: unknown): value is ReadmeLanguage {
  return typeof value === "string" && (README_LANGUAGES as readonly string[]).includes(value);
}

// Every title starts with its recommendation, except the introduction ("About me"): most READMEs open without one.
function defaultHeadings(): Record<HeadingId, string | null> {
  return { intro: null, technologies: "", projects: "", contact: "" };
}

export function defaultReadme(language: ReadmeLanguage): DraftReadme {
  return {
    template: "classic",
    language,
    sections: { greeting: true, intro: true, technologies: true, projects: true, contact: true },
    order: templateOrder("classic"),
    customSections: [],
    contactStyle: "list",
    greeting: "",
    intro: "",
    stack: emptyContent(true),
    projects: [],
    headings: defaultHeadings(),
  };
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Rebuilds stored README settings with known fields and valid values only. */
export function normalizeReadme(raw: unknown, fallbackLanguage: ReadmeLanguage = "pt-BR"): DraftReadme {
  const base = defaultReadme(fallbackLanguage);
  if (typeof raw !== "object" || raw === null) return base;
  const input = raw as Record<string, unknown>;
  const template = isTemplateId(input.template) ? input.template : base.template;
  const language = isReadmeLanguage(input.language) ? input.language : base.language;
  const stored = upgradeLegacyReadme(input, template, language);
  const sections = typeof stored.sections === "object" && stored.sections !== null
    ? (stored.sections as Record<string, unknown>)
    : {};
  const text = (key: "greeting" | "intro") =>
    typeof stored[key] === "string" ? (stored[key] as string).replaceAll("\0", "") : "";
  const customSections = normalizeCustomSections(stored.customSections);
  // "Icons with name" was removed: plain icons are the closest style.
  const contactStyle = stored.contactStyle === "iconsWithName" ? "icons" : stored.contactStyle;

  return {
    template,
    language,
    sections: Object.fromEntries(
      SECTION_IDS.map((id) => [id, typeof sections[id] === "boolean" ? sections[id] : base.sections[id]]),
    ) as Record<SectionId, boolean>,
    order: completeOrder(stored.order, template, customSections),
    customSections,
    contactStyle: isContactStyle(contactStyle) ? contactStyle : base.contactStyle,
    greeting: text("greeting"),
    intro: text("intro"),
    stack: normalizeSectionContent(stored.stack, base.stack),
    projects: [...new Set(stringList(stored.projects))].slice(0, MAX_PROJECTS),
    headings: Object.fromEntries(
      HEADING_IDS.map((id) => {
        const value = typeof stored.headings === "object" && stored.headings !== null
          ? (stored.headings as Record<string, unknown>)[id]
          : undefined;
        // Short-lived "hideContactHeading" flag, replaced by a null contact title.
        if (id === "contact" && stored.hideContactHeading === true) return [id, null];
        // NUL is stripped: Postgres rejects it in jsonb (READMEs read back from GitHub can contain anything).
        if (typeof value === "string") return [id, value.replaceAll("\0", "")];
        return [id, value === null ? null : base.headings[id]];
      }),
    ) as Record<HeadingId, string | null>,
  };
}

// GitHub repository names: letters, digits, ".", "-" and "_".
const REPO_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

function isOwnRepository(fullName: string, login: string): boolean {
  const [owner, name, ...rest] = fullName.split("/");
  return (
    rest.length === 0 &&
    owner?.toLowerCase() === login.toLowerCase() &&
    REPO_NAME_PATTERN.test(name ?? "") &&
    name.toLowerCase() !== login.toLowerCase() // the profile README repository itself
  );
}

type Clean = (value: FormDataEntryValue | null) => string;

/** The greeting becomes a "# " heading: line breaks would start new blocks. */
export function singleLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

/**
 * Reads and validates the README part of the editor form.
 * Projects must belong to `login`; whether they still exist is checked when
 * the README is generated, against the user's real repositories.
 */
export function parseReadmeForm(
  formData: FormData,
  clean: Clean,
  login: string,
): { value: DraftReadme; errors: ReadmeFieldErrors } {
  const errors: ReadmeFieldErrors = {};
  const template = clean(formData.get("readme.template"));
  const language = clean(formData.get("readme.language"));
  const order = formData.getAll("readme.order").map(clean);
  const contactStyle = clean(formData.get("readme.contactStyle"));
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
  const custom = parseCustomSections(clean(formData.get("readme.customSections")));
  const stack = parseSectionContent(clean(formData.get("readme.stack")), emptyContent(true));
  const validTemplate = isTemplateId(template) ? template : "classic";

  const value: DraftReadme = {
    template: isTemplateId(template) ? template : "classic",
    language: isReadmeLanguage(language) ? language : "pt-BR",
    sections: Object.fromEntries(
      SECTION_IDS.map((id) => [id, formData.get(`readme.section.${id}`) === "on"]),
    ) as Record<SectionId, boolean>,
    // Missing fields fall back to the defaults; present but invalid ones are errors below.
    order: isSectionOrder(order, custom.value) ? order : completeOrder(order, validTemplate, custom.value),
    customSections: custom.value,
    contactStyle: isContactStyle(contactStyle) ? contactStyle : "list",
    greeting: singleLine(clean(formData.get("readme.greeting"))),
    intro: clean(formData.get("readme.intro")),
    stack: stack.value,
    headings: Object.fromEntries(
      HEADING_IDS.map((id) => [
        id,
        formData.get(`readme.headingHidden.${id}`) === "on" ? null : singleLine(clean(formData.get(`readme.heading.${id}`))),
      ]),
    ) as Record<HeadingId, string | null>,
    projects: unique(formData.getAll("readme.projects").map(clean)),
  };

  if (!isTemplateId(template)) errors.template = { code: "invalidOption" };
  if (!isReadmeLanguage(language)) errors.language = { code: "invalidOption" };
  if (order.length > 0 && !isSectionOrder(order, custom.value)) errors.order = { code: "invalidOption" };
  if (custom.error) errors.customSections = custom.error;
  if (stack.error) errors.stack = stack.error;
  if (contactStyle && !isContactStyle(contactStyle)) errors.contactStyle = { code: "invalidOption" };
  for (const field of ["greeting", "intro"] as const) {
    if (value[field].length > README_MAX_LENGTH[field]) {
      errors[field] = { code: "tooLong", max: README_MAX_LENGTH[field] };
    }
  }
  if (Object.values(value.headings).some((heading) => (heading?.length ?? 0) > README_MAX_LENGTH.heading)) {
    errors.headings = { code: "tooLong", max: README_MAX_LENGTH.heading };
  }
  if (value.projects.length > MAX_PROJECTS) {
    errors.projects = { code: "tooMany", max: MAX_PROJECTS };
  } else if (value.projects.some((name) => !isOwnRepository(name, login))) {
    errors.projects = { code: "invalidOption" };
  }

  return { value, errors };
}
