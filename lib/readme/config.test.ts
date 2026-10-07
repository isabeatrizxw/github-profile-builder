import { describe, expect, it } from "vitest";
import { defaultReadme, normalizeReadme, parseReadmeForm } from "./config";
import { emptyContent, newCustomSection } from "./custom-sections";

const clean = (value: FormDataEntryValue | null) => (typeof value === "string" ? value.trim() : "");

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries({ "readme.template": "classic", "readme.language": "en", ...fields })) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

describe("parseReadmeForm", () => {
  it("reads the section order and the contact style", () => {
    const order = ["contact", "intro", "technologies", "projects"];
    const { value, errors } = parseReadmeForm(
      form({ "readme.order": order, "readme.contactStyle": "icons" }),
      clean,
      "octocat",
    );
    expect(errors).toEqual({});
    expect(value.order).toEqual(order);
    expect(value.contactStyle).toBe("icons");
  });

  it("rejects an order that misses or repeats sections, and unknown contact styles", () => {
    const { value, errors } = parseReadmeForm(
      form({ "readme.order": ["contact", "contact", "technologies", "projects"], "readme.contactStyle": "iconsWithName" }),
      clean,
      "octocat",
    );
    expect(errors).toEqual({ order: { code: "invalidOption" }, contactStyle: { code: "invalidOption" } });
    // The invalid order is reported and repaired: known entries kept once, missing ones appended.
    expect(value.order).toEqual(["contact", "technologies", "projects", "intro"]);
  });

  it("reads template, language, sections, texts, technologies, custom sections and projects", () => {
    const skills = { ...newCustomSection("skills"), title: "Skills", technologies: ["docker"] };
    const { value, errors } = parseReadmeForm(
      form({
        "readme.template": "compact",
        "readme.section.greeting": "on",
        "readme.section.technologies": "on",
        "readme.intro": " Backend developer\n\n## Sobre mim ",
        "readme.stack": JSON.stringify({ ...emptyContent(false), technologies: ["java", "postgresql", "java"] }),
        "readme.customSections": JSON.stringify([skills]),
        "readme.projects": ["Octocat/hello", "octocat/api"],
      }),
      clean,
      "octocat",
    );

    expect(errors).toEqual({});
    expect(value).toEqual({
      template: "compact",
      language: "en",
      sections: { greeting: true, intro: false, technologies: true, projects: false, contact: false },
      // No order in the form: the template's suggested order, custom sections at the end.
      order: ["intro", "technologies", "projects", "contact", "custom:skills"],
      customSections: [skills],
      contactStyle: "list",
      greeting: "",
      intro: "Backend developer\n\n## Sobre mim",
      // Repeated technologies are kept once.
      stack: { ...emptyContent(false), technologies: ["java", "postgresql"] },
      projects: ["Octocat/hello", "octocat/api"],
      headings: { intro: "", technologies: "", projects: "", contact: "" },
    });
  });

  it("uses the default grouped stack when the form has none", () => {
    expect(parseReadmeForm(form({}), clean, "octocat").value.stack).toEqual(emptyContent(true));
  });

  it("reads custom headings on a single line and limits their length", () => {
    const { value, errors } = parseReadmeForm(
      form({ "readme.heading.intro": " Quem sou eu\n", "readme.heading.technologies": "a".repeat(61) }),
      clean,
      "octocat",
    );
    expect(value.headings.intro).toBe("Quem sou eu");
    expect(errors).toEqual({ headings: { code: "tooLong", max: 60 } });
  });

  it("reads removed titles as null and blank ones as the recommended title", () => {
    const { value } = parseReadmeForm(
      form({ "readme.heading.contact": "", "readme.headingHidden.contact": "on", "readme.heading.projects": "" }),
      clean,
      "octocat",
    );
    expect(value.headings.contact).toBeNull();
    expect(value.headings.projects).toBe("");
    expect(normalizeReadme({ headings: { contact: null } }).headings.contact).toBeNull();
  });

  it("rejects unknown templates, languages and technologies", () => {
    const { errors } = parseReadmeForm(
      form({
        "readme.template": "fancy",
        "readme.language": "fr",
        "readme.stack": JSON.stringify({ ...emptyContent(true), technologies: ["cobol"] }),
        "readme.customSections": JSON.stringify([{ ...newCustomSection("old"), technologies: ["cobol"] }]),
      }),
      clean,
      "octocat",
    );

    expect(errors).toEqual({
      template: { code: "invalidOption" },
      language: { code: "invalidOption" },
      stack: { code: "invalidOption" },
      customSections: { code: "invalidOption" },
    });
  });

  it("only accepts the user's own repositories, up to six", () => {
    for (const forged of ["someone/else", "octocat/", "octocat/a/b", "octocat/ weird", "octocat/octocat"]) {
      expect(parseReadmeForm(form({ "readme.projects": [forged] }), clean, "octocat").errors).toEqual({
        projects: { code: "invalidOption" },
      });
    }

    const seven = Array.from({ length: 7 }, (_, index) => `octocat/repo-${index}`);
    expect(parseReadmeForm(form({ "readme.projects": seven }), clean, "octocat").errors).toEqual({
      projects: { code: "tooMany", max: 6 },
    });
  });

  it("limits text lengths", () => {
    expect(parseReadmeForm(form({ "readme.intro": "a".repeat(1500) }), clean, "octocat").errors).toEqual({});
    const { errors } = parseReadmeForm(form({ "readme.intro": "a".repeat(1501) }), clean, "octocat");
    expect(errors).toEqual({ intro: { code: "tooLong", max: 1500 } });
  });
});

describe("normalizeReadme", () => {
  it("returns defaults for drafts saved before READMEs existed", () => {
    expect(normalizeReadme(undefined, "en")).toEqual(defaultReadme("en"));
  });

  it("starts with a hidden introduction title and a grouped stack", () => {
    const readme = defaultReadme("pt-BR");
    expect(readme.headings).toEqual({ intro: null, technologies: "", projects: "", contact: "" });
    expect(readme.stack).toEqual(emptyContent(true));
    expect(normalizeReadme({}).headings.intro).toBeNull();
  });

  it("drops technologies that are no longer in the catalog", () => {
    const stack = { ...emptyContent(true), technologies: ["java", "removed-tech"] };
    expect(normalizeReadme({ stack }).stack.technologies).toEqual(["java"]);
    const customSections = [{ ...newCustomSection("skills"), technologies: ["java", "removed-tech"] }];
    expect(normalizeReadme({ customSections }).customSections[0].technologies).toEqual(["java"]);
  });
});

describe("normalizeReadme order and contact style", () => {
  it("gives drafts saved before reordering existed their template's order and the list style", () => {
    const readme = normalizeReadme({ template: "compact", language: "en" });
    expect(readme.order).toEqual(["intro", "technologies", "projects", "contact"]);
    expect(readme.contactStyle).toBe("list");
  });

  it("keeps a valid stored order", () => {
    const order = ["projects", "contact", "intro", "technologies"];
    expect(normalizeReadme({ template: "compact", order, contactStyle: "inline" })).toMatchObject({ order, contactStyle: "inline" });
  });

  it("turns the removed icons-with-name style into icons", () => {
    expect(normalizeReadme({ contactStyle: "iconsWithName" }).contactStyle).toBe("icons");
  });
});
