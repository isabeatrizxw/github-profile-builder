// README templates. They share the same sections and differ in order and in
// how sections are presented (the presentation lives in the generator).

export const SECTION_IDS = ["greeting", "intro", "technologies", "projects", "contact"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

/** The greeting is always first; the user can reorder every other section. */
export type MovableSectionId = Exclude<SectionId, "greeting">;
export const MOVABLE_SECTION_IDS = SECTION_IDS.filter(
  (id): id is MovableSectionId => id !== "greeting",
);

export const TEMPLATE_IDS = ["classic", "minimal", "compact"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type Template = {
  id: TemplateId;
  /** Suggested order of the movable sections; the draft keeps its own order. */
  defaultOrder: readonly MovableSectionId[];
};

export const TEMPLATES: Record<TemplateId, Template> = {
  // Technology icons, projects as a list.
  classic: {
    id: "classic",
    defaultOrder: ["intro", "technologies", "projects", "contact"],
  },
  // Text only: technologies as "Java · C# · Python", no images.
  minimal: {
    id: "minimal",
    defaultOrder: ["intro", "technologies", "projects", "contact"],
  },
  // Smaller icons, projects in a table.
  compact: {
    id: "compact",
    defaultOrder: ["intro", "technologies", "projects", "contact"],
  },
};

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && (TEMPLATE_IDS as readonly string[]).includes(value);
}
