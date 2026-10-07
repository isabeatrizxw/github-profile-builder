import { describe, expect, it } from "vitest";
import { normalizeReadme, type DraftReadme } from "./config";
import { emptyCategoryTitles, emptyContent, newCustomSection } from "./custom-sections";
import { generateReadme } from "./generate";
import { upgradeLegacyReadme } from "./legacy";
import { readmeMarker, readReadmeMarker } from "./marker";

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

// (a) Before 2026-10-07: technologies as a plain list, "about" as its own section.
const OLD_CLASSIC = {
  template: "classic",
  language: "pt-BR",
  sections: { greeting: true, intro: true, about: true, technologies: true, projects: true, contact: true },
  intro: "",
  about: "Texto",
  technologies: ["java", "postgresql"],
  headings: { about: "", technologies: "", projects: "", contact: "" },
};

// (b) 2026-10-07, briefly: technologies in a custom section with id "technologies".
const INTERIM = {
  template: "classic",
  language: "pt-BR",
  sections: { greeting: true, intro: true, about: true, projects: true, contact: true },
  order: ["intro", "about", "custom:technologies", "projects", "contact", "custom:abc123"],
  customSections: [
    { ...newCustomSection("technologies"), title: "Minha stack", technologies: ["java"], groupByCategory: true },
    { ...newCustomSection("abc123"), title: "Estudando", text: "Go" },
  ],
  contactStyle: "list",
  greeting: "",
  intro: "Backend dev",
  about: "",
  projects: [],
  headings: { about: "", projects: "", contact: "" },
};

function markdownOf(readme: DraftReadme): string {
  return generateReadme({ readme, profile: PROFILE, login: "mona", repositories: [] }).markdown;
}

describe("upgradeLegacyReadme (a): plain technology list", () => {
  it("becomes the grouped Technologies section content, in the old classic order", () => {
    const readme = normalizeReadme(OLD_CLASSIC);
    expect(readme.stack).toEqual({ ...emptyContent(true), technologies: ["java", "postgresql"] });
    expect(readme.headings.technologies).toBe("");
    expect(readme.order).toEqual(["intro", "technologies", "projects", "contact"]);
    expect(readme).not.toHaveProperty("technologies");
    expect(readme).not.toHaveProperty("about");
  });

  it("keeps the generated README of an old classic draft", () => {
    const markdown = markdownOf(normalizeReadme(OLD_CLASSIC));
    expect(markdown).toContain("Mona\n\n## Sobre mim\n\nTexto\n\n## Tecnologias\n\n### Linguagens");
    expect(markdown).toContain("### Bancos de Dados");
  });

  it("keeps the compact template's single icon row", () => {
    const readme = normalizeReadme({ ...OLD_CLASSIC, template: "compact" });
    expect(readme.stack.groupByCategory).toBe(false);
    expect(readme.order).toEqual(["intro", "technologies", "projects", "contact"]);
    expect(markdownOf(readme)).not.toContain("### ");
  });

  it("carries over custom global category titles and a hidden section title", () => {
    const readme = normalizeReadme({
      ...OLD_CLASSIC,
      headings: { ...OLD_CLASSIC.headings, technologies: null, languages: "☕ Linguagens que uso" },
    });
    expect(readme.headings.technologies).toBeNull();
    expect(readme.stack.categoryTitles).toEqual({ ...emptyCategoryTitles(), languages: "☕ Linguagens que uso" });
    const markdown = markdownOf(readme);
    expect(markdown).not.toContain("## Tecnologias");
    expect(markdown).toContain("### ☕ Linguagens que uso");
  });

  // Known bug: legacy.ts reads `headings[category] ?? ""`, so a hidden (null)
  // category title becomes the recommended one. Remove `.fails` once fixed.
  it("keeps a hidden global category title hidden", () => {
    const readme = normalizeReadme({ ...OLD_CLASSIC, headings: { ...OLD_CLASSIC.headings, databases: null } });
    expect(readme.stack.categoryTitles.databases).toBeNull();
    expect(markdownOf(readme)).not.toContain("Bancos de Dados");
  });

  it("keeps a stored order, without about", () => {
    const order = ["contact", "technologies", "about", "intro", "projects"];
    expect(normalizeReadme({ ...OLD_CLASSIC, order }).order).toEqual(["contact", "technologies", "intro", "projects"]);
  });

  it("keeps a switched-off section switched off and drops technologies no longer in the catalog", () => {
    const readme = normalizeReadme({
      ...OLD_CLASSIC,
      sections: { ...OLD_CLASSIC.sections, technologies: false },
      technologies: ["java", "removed-tech"],
    });
    expect(readme.sections.technologies).toBe(false);
    expect(readme.stack.technologies).toEqual(["java"]);
  });

  it("does not change the stored object", () => {
    const stored = structuredClone(OLD_CLASSIC);
    upgradeLegacyReadme(stored, "classic", "pt-BR");
    expect(stored).toEqual(OLD_CLASSIC);
  });
});

describe("upgradeLegacyReadme (b): interim custom section", () => {
  it("moves the section into the Technologies section, with its title and place", () => {
    const readme = normalizeReadme(INTERIM);
    expect(readme.stack).toEqual({ ...emptyContent(true), technologies: ["java"] });
    expect(readme.headings.technologies).toBe("Minha stack");
    expect(readme.customSections.map((section) => section.id)).toEqual(["abc123"]);
    expect(readme.order).toEqual(["intro", "technologies", "projects", "contact", "custom:abc123"]);
    expect(markdownOf(readme)).toContain("Backend dev\n\n## Minha stack\n\n### Linguagens");
  });

  it("hides the title when the section had none", () => {
    const customSections = [{ ...INTERIM.customSections[0], title: "" }, INTERIM.customSections[1]];
    expect(normalizeReadme({ ...INTERIM, customSections }).headings.technologies).toBeNull();
  });
});

describe("upgradeLegacyReadme (c): introduction and About me", () => {
  const old = { ...OLD_CLASSIC, intro: "Backend dev", technologies: [] };

  it("joins both texts, with the shown About me title inside the text", () => {
    const readme = normalizeReadme({ ...old, headings: { ...old.headings, about: "Quem sou eu" } });
    expect(readme.intro).toBe("Backend dev\n\n## Quem sou eu\n\nTexto");
    expect(readme.headings.intro).toBeNull();
    expect(readme.sections.intro).toBe(true);
    expect(readme.order).not.toContain("about");
  });

  it("uses the recommended title in the draft's language, or none when it was hidden", () => {
    expect(normalizeReadme(old).intro).toBe("Backend dev\n\n## Sobre mim\n\nTexto");
    expect(normalizeReadme({ ...old, language: "en" }).intro).toBe("Backend dev\n\n## About me\n\nTexto");
    expect(normalizeReadme({ ...old, headings: { ...old.headings, about: null } }).intro).toBe("Backend dev\n\nTexto");
  });

  it("leaves out the text of a switched-off section", () => {
    const aboutOff = normalizeReadme({ ...old, sections: { ...old.sections, about: false } });
    expect(aboutOff.intro).toBe("Backend dev");
    const introOff = normalizeReadme({ ...old, sections: { ...old.sections, intro: false } });
    expect(introOff.intro).toBe("## Sobre mim\n\nTexto");
    expect(introOff.sections.intro).toBe(true);
  });

  it("keeps the introduction switched on when both old texts were empty", () => {
    const empty = normalizeReadme({ ...old, intro: "", about: "" });
    expect(empty.intro).toBe("");
    expect(empty.sections.intro).toBe(true);
  });
});

describe("upgradeLegacyReadme idempotence", () => {
  it("normalizing a second time changes nothing", () => {
    for (const stored of [OLD_CLASSIC, { ...OLD_CLASSIC, template: "compact" }, INTERIM]) {
      const once = normalizeReadme(stored);
      expect(normalizeReadme(once)).toEqual(once);
      expect(normalizeReadme(JSON.parse(JSON.stringify(once)))).toEqual(once);
    }
  });

  it("upgrades the settings stored in a README published before the change", () => {
    const markdown = `# Olá\n\n${readmeMarker(OLD_CLASSIC as unknown as DraftReadme)}\n`;
    expect(readReadmeMarker(markdown)).toEqual(normalizeReadme(OLD_CLASSIC));
  });
});
