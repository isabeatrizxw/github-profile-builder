import { describe, expect, it } from "vitest";
import { defaultReadme, normalizeReadme, parseReadmeForm } from "./config";
import {
  completeOrder,
  emptyContent,
  emptyCategoryTitles,
  normalizeCustomSections,
  parseCustomSections,
  parseSectionContent,
  type CustomSection,
} from "./custom-sections";
import { generateReadme } from "./generate";

const STUDYING: CustomSection = {
  id: "abc123",
  title: "📚 Estudando",
  text: "Arquitetura **cloud**",
  technologies: ["amazonwebservices", "quarkus", "java"],
  groupByCategory: false,
  categoryTitles: emptyCategoryTitles(),
};

const PROFILE = {
  name: "Mona",
  bio: "",
  location: "",
  company: "",
  blog: "",
  twitterUsername: "",
  email: "",
  hireable: false,
  socialAccounts: [],
};

function generate(sections: CustomSection[], order: string[], template: "classic" | "minimal" = "classic") {
  const readme = normalizeReadme({ ...defaultReadme("pt-BR"), template, customSections: sections, order });
  return generateReadme({ readme, profile: PROFILE, login: "mona", repositories: [] }).markdown;
}

describe("custom sections in the README", () => {
  it("renders title, text and one list of icons where the user placed it", () => {
    const markdown = generate([STUDYING], ["custom:abc123", "intro", "technologies", "projects", "contact"]);
    expect(markdown).toContain("# Olá, eu sou Mona\n\n## 📚 Estudando\n\nArquitetura **cloud**\n\n<p>\n");
    expect(markdown).toContain("icons/quarkus/quarkus-original.svg");
    expect(markdown).not.toContain("### ");
  });

  it("groups by category under the category titles when asked", () => {
    const markdown = generate([{ ...STUDYING, groupByCategory: true }], ["intro", "custom:abc123"]);
    expect(markdown).toContain("### Linguagens");
    expect(markdown).toContain("### Frameworks");
    expect(markdown).toContain("### Ferramentas");
  });

  it("uses the section's own category titles: custom text, recommended when blank, none when null", () => {
    const categoryTitles = { ...emptyCategoryTitles(), languages: "☕ Linguagens que uso", tools: null };
    const markdown = generate([{ ...STUDYING, groupByCategory: true, categoryTitles }], ["custom:abc123"]);
    expect(markdown).toContain("### ☕ Linguagens que uso");
    expect(markdown).toContain("### Frameworks");
    expect(markdown).not.toContain("Ferramentas");
    expect(markdown).toContain("icons/amazonwebservices/");
  });

  it("uses names instead of icons in the minimal template, and no title when empty", () => {
    const markdown = generate([{ ...STUDYING, title: "", text: "" }], ["custom:abc123"], "minimal");
    expect(markdown).toContain("Mona\n\nAWS · Quarkus · Java\n\n");
  });

  it("leaves out a section with nothing in it", () => {
    const markdown = generate([{ ...STUDYING, text: "", technologies: [] }], ["custom:abc123"]);
    expect(markdown).not.toContain("Estudando");
  });
});

describe("normalizeCustomSections", () => {
  it("drops invalid entries, repeated ids and unknown technologies, keeping at most five", () => {
    const many = Array.from({ length: 7 }, (_, index) => ({ ...STUDYING, id: `s${index}` }));
    expect(normalizeCustomSections(many)).toHaveLength(5);
    expect(normalizeCustomSections([STUDYING, STUDYING, { id: "BAD ID" }, "x"])).toHaveLength(1);
    expect(normalizeCustomSections([{ ...STUDYING, technologies: ["cobol-2000", "java"] }])[0].technologies).toEqual(["java"]);
  });
});

describe("parseCustomSections", () => {
  it("reports invalid JSON, too many sections and text that is too long", () => {
    expect(parseCustomSections("{").error).toEqual({ code: "invalidOption" });
    const six = JSON.stringify(Array.from({ length: 6 }, (_, index) => ({ ...STUDYING, id: `s${index}` })));
    expect(parseCustomSections(six).error).toEqual({ code: "tooMany", max: 5 });
    expect(parseCustomSections(JSON.stringify([{ ...STUDYING, text: "a".repeat(1001) }])).error).toEqual({ code: "tooLong", max: 1000 });
    expect(parseCustomSections(JSON.stringify([STUDYING]))).toEqual({ value: [STUDYING] });
  });

  it("reports category titles that are too long, unknown technologies and too many technologies", () => {
    const longTitle = { ...STUDYING, categoryTitles: { ...emptyCategoryTitles(), databases: "a".repeat(61) } };
    expect(parseCustomSections(JSON.stringify([longTitle])).error).toEqual({ code: "tooLong", max: 60 });
    expect(parseCustomSections(JSON.stringify([{ ...STUDYING, technologies: ["cobol"] }])).error).toEqual({ code: "invalidOption" });
    const tooMany = { ...STUDYING, technologies: Array.from({ length: 41 }, (_, index) => `tech${index}`) };
    expect(parseCustomSections(JSON.stringify([tooMany])).error).toEqual({ code: "tooMany", max: 40 });
  });

  it("keeps hidden (null) category titles and reads missing ones as recommended", () => {
    const raw = { ...STUDYING, categoryTitles: { languages: null } };
    expect(parseCustomSections(JSON.stringify([raw])).value[0].categoryTitles).toEqual({
      languages: null, frameworks: "", databases: "", tools: "",
    });
  });

  it("is read by the editor form together with an order that includes it", () => {
    const data = new FormData();
    data.append("readme.template", "classic");
    data.append("readme.language", "pt-BR");
    data.append("readme.customSections", JSON.stringify([STUDYING]));
    for (const key of ["intro", "custom:abc123", "technologies", "projects", "contact"]) data.append("readme.order", key);
    const { value, errors } = parseReadmeForm(data, (v) => (typeof v === "string" ? v.trim() : ""), "mona");
    expect(errors).toEqual({});
    expect(value.customSections).toEqual([STUDYING]);
    expect(value.order[1]).toBe("custom:abc123");
  });
});

describe("completeOrder", () => {
  it("adds missing fixed sections in the template's order and custom ones at the end", () => {
    expect(completeOrder(["contact", "custom:gone"], "compact", [STUDYING])).toEqual([
      "contact", "intro", "technologies", "projects", "custom:abc123",
    ]);
  });
});

describe("parseSectionContent", () => {
  const fallback = emptyContent(true);
  const parse = (value: unknown) => parseSectionContent(JSON.stringify(value), fallback);

  it("uses the fallback when the form sends nothing", () => {
    expect(parseSectionContent("", fallback)).toEqual({ value: fallback });
  });

  it("reads valid content", () => {
    const content = { ...emptyContent(false), text: "Hoje", technologies: ["java"] };
    expect(parse(content)).toEqual({ value: content });
  });

  it("reports invalid JSON and values that are not an object", () => {
    expect(parseSectionContent("{", fallback)).toEqual({ value: fallback, error: { code: "invalidOption" } });
    expect(parse(["java"]).error).toEqual({ code: "invalidOption" });
    expect(parse(null).error).toEqual({ code: "invalidOption" });
  });

  it("reports unknown technologies, too many technologies and texts or titles that are too long", () => {
    expect(parse({ ...fallback, technologies: ["cobol"] }).error).toEqual({ code: "invalidOption" });
    const many = Array.from({ length: 41 }, (_, index) => `tech${index}`);
    expect(parse({ ...fallback, technologies: many }).error).toEqual({ code: "tooMany", max: 40 });
    expect(parse({ ...fallback, text: "a".repeat(1001) }).error).toEqual({ code: "tooLong", max: 1000 });
    const longTitle = { ...fallback, categoryTitles: { ...fallback.categoryTitles, tools: "a".repeat(61) } };
    expect(parse(longTitle).error).toEqual({ code: "tooLong", max: 60 });
  });
});
