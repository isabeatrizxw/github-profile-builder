import { describe, expect, it } from "vitest";
import type { DraftProfile } from "@/lib/drafts/content";
import { defaultReadme, type DraftReadme } from "./config";
import { emptyContent, type SectionContent } from "./custom-sections";
import { escapeMarkdown, generateReadme, type ReadmeProject } from "./generate";
import { readReadmeMarker } from "./marker";

const PROFILE: DraftProfile = {
  name: "Mona *Lisa*",
  bio: "",
  location: "",
  company: "",
  blog: "example.com",
  twitterUsername: "mona",
  email: "mona@example.com",
  hireable: false,
  socialAccounts: ["https://linkedin.com/in/mona"],
};

const REPOS: ReadmeProject[] = [
  {
    fullName: "octocat/api",
    name: "api",
    description: "REST API | Spring",
    htmlUrl: "https://github.com/octocat/api",
    language: "Java",
  },
];

function readme(overrides: Partial<DraftReadme> = {}): DraftReadme {
  return { ...defaultReadme("pt-BR"), ...overrides };
}

function generate(overrides: Partial<DraftReadme> = {}, profile: DraftProfile = PROFILE) {
  return generateReadme({ readme: readme(overrides), profile, login: "octocat", repositories: REPOS });
}

/** Content of the "Technologies" section, grouped by category unless overridden. */
function stack(technologies: string[], overrides: Partial<SectionContent> = {}): SectionContent {
  return { ...emptyContent(true), technologies, ...overrides };
}

describe("generateReadme", () => {
  it("uses the default greeting with the escaped name when the greeting is empty", () => {
    expect(generate().markdown.startsWith("# Olá, eu sou Mona \\*Lisa\\*\n")).toBe(true);
  });

  it("keeps the user's own Markdown as written, without an introduction title by default", () => {
    const { markdown } = generate({ greeting: "Hey **there**", intro: "I like _clean_ code.\n\n- one\n- two" });
    expect(markdown).toContain("# Hey **there**\n\nI like _clean_ code.\n\n- one\n- two");
    expect(markdown).not.toContain("## Sobre mim");
  });

  it("writes fixed texts in the README language", () => {
    const { markdown } = generate({ language: "en", stack: stack(["java"]) });
    expect(markdown).toContain("# Hi, I'm Mona \\*Lisa\\*");
    expect(markdown).toContain("## Tech stack");
    expect(markdown).toContain("### Languages");
  });

  it("leaves out disabled sections and sections without content", () => {
    const { markdown } = generate({
      sections: { greeting: false, intro: true, technologies: true, projects: true, contact: false },
      intro: "",
      stack: emptyContent(true),
      projects: [],
    });
    // Only the invisible settings marker remains.
    expect(markdown).toMatch(/^<!-- github-profile-builder:v1 [A-Za-z0-9+/=]+ -->\n$/);
    const off = generate({ sections: { ...defaultReadme("pt-BR").sections, technologies: false }, stack: stack(["java"]) });
    expect(off.markdown).not.toContain("Tecnologias");
  });

  it("embeds the settings so a new draft can start from the published README", () => {
    const settings = readme({ intro: "Olá ✨ **mundo**", stack: stack(["java"], { text: "Hoje" }), projects: ["octocat/api"] });
    const { markdown } = generateReadme({ readme: settings, profile: PROFILE, login: "octocat", repositories: REPOS });
    expect(readReadmeMarker(markdown)).toEqual(settings);
    expect(readReadmeMarker("# README written by hand\n")).toBeNull();
  });

  it("shows the X account once even when GitHub also lists it as a social account", () => {
    const { markdown } = generate({}, { ...PROFILE, socialAccounts: ["https://twitter.com/mona", "https://linkedin.com/in/mona"] });
    expect(markdown.match(/x\.com\/mona|twitter\.com\/mona/g)).toHaveLength(1);
  });

  it("classic: groups icons by category and uses a light icon for dark themes when needed", () => {
    const { markdown } = generate({ template: "classic", stack: stack(["java", "github"]) });
    expect(markdown).toContain("## Tecnologias\n\n### Linguagens");
    expect(markdown).toContain("### Ferramentas");
    expect(markdown).toContain(
      '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/java/java-original.svg" alt="Java" title="Java" width="40" height="40" />',
    );
    expect(markdown).toContain(
      '<picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.simpleicons.org/github/white" />',
    );
  });

  it("minimal: lists technologies as text, without images", () => {
    const { markdown } = generate({ template: "minimal", stack: stack(["java", "csharp", "postgresql"]) });
    expect(markdown).toContain("**Linguagens**\n\nJava · C#");
    expect(markdown).toContain("**Bancos de Dados**\n\nPostgreSQL");
    expect(markdown).not.toContain("<img");
  });

  it("compact: one row of smaller icons, projects in a table with escaped cells", () => {
    const { markdown } = generate({
      template: "compact",
      stack: stack(["java", "postgresql"], { groupByCategory: false }),
      projects: ["octocat/api"],
    });
    expect(markdown).not.toContain("### ");
    expect(markdown).toContain('alt="Java" title="Java" width="32" height="32"');
    expect(markdown).toContain("| Projeto | Descrição | Linguagem |");
    expect(markdown).toContain("| [api](<https://github.com/octocat/api>) | REST API \\| Spring | Java |");
  });

  it("classic: lists projects with real GitHub data", () => {
    const { markdown } = generate({ projects: ["octocat/api"] });
    expect(markdown).toContain("- [**api**](<https://github.com/octocat/api>) — REST API \\| Spring · `Java`");
  });

  it("reports selected projects that no longer exist and leaves them out", () => {
    const result = generate({ projects: ["octocat/api", "octocat/gone"] });
    expect(result.missingProjects).toEqual(["octocat/gone"]);
    expect(result.markdown).not.toContain("gone");
  });

  it("builds contact links from the profile", () => {
    const { markdown } = generate();
    expect(markdown).toContain("- 🌐 [example.com](<https://example.com>)");
    expect(markdown).toContain("- ✉️ [mona\\@example.com](<mailto:mona@example.com>)");
    expect(markdown).toContain("- 𝕏 [\\@mona](<https://x.com/mona>)");
    expect(markdown).toContain("- 🔗 [linkedin.com/in/mona](<https://linkedin.com/in/mona>)");
  });
});

describe("technologies section", () => {
  it("grouped: category titles in the catalog order", () => {
    const { markdown } = generate({ stack: stack(["postgresql", "java"]) });
    expect(markdown.indexOf("### Linguagens")).toBeLessThan(markdown.indexOf("### Bancos de Dados"));
  });

  it("list: one row of icons in selection order, without category titles", () => {
    const { markdown } = generate({ stack: stack(["postgresql", "java"], { groupByCategory: false }) });
    expect(markdown).toContain(
      '## Tecnologias\n\n<p>\n<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/postgresql/',
    );
    expect(markdown).not.toContain("### ");
  });

  it("text: shown before the technologies, or alone", () => {
    const withTech = generate({ stack: stack(["java"], { text: "Aprendendo **Go**" }) }).markdown;
    expect(withTech).toContain("## Tecnologias\n\nAprendendo **Go**\n\n### Linguagens");
    const textOnly = generate({ stack: stack([], { text: "Só texto" }) }).markdown;
    expect(textOnly).toContain("## Tecnologias\n\nSó texto");
  });

  it("hidden title: the content follows the previous section directly", () => {
    const { markdown } = generate({
      intro: "Oi",
      stack: stack(["java"], { groupByCategory: false }),
      headings: { ...defaultReadme("pt-BR").headings, technologies: null },
    });
    expect(markdown).not.toContain("Tecnologias");
    expect(markdown).toContain("Oi\n\n<p>\n<img");
  });
});

describe("custom headings", () => {
  it("replaces section and category titles, falling back to the defaults", () => {
    const content = stack(["java", "postgresql"]);
    const { markdown } = generate({
      stack: { ...content, categoryTitles: { ...content.categoryTitles, languages: "☕ Linguagens que uso" } },
      headings: { ...defaultReadme("pt-BR").headings, technologies: "Minha stack" },
    });
    expect(markdown).toContain("## Minha stack\n\n### ☕ Linguagens que uso");
    expect(markdown).toContain("### Bancos de Dados");
  });

  it("shows the introduction title when set: recommended when blank, or custom", () => {
    const headings = defaultReadme("pt-BR").headings;
    const recommended = generate({ intro: "Texto", headings: { ...headings, intro: "" } }).markdown;
    expect(recommended).toContain("\\*Lisa\\*\n\n## Sobre mim\n\nTexto");
    const custom = generate({ intro: "Texto", headings: { ...headings, intro: "Quem sou eu" } }).markdown;
    expect(custom).toContain("## Quem sou eu\n\nTexto");
    const english = generate({ language: "en", intro: "Text", headings: { ...headings, intro: "" } }).markdown;
    expect(english).toContain("## About me\n\nText");
  });

  it("leaves out titles set to null, in every template", () => {
    const headings = { ...defaultReadme("pt-BR").headings, technologies: null };
    const hidden = (technologies: string[]) => {
      const content = stack(technologies);
      return { ...content, categoryTitles: { ...content.categoryTitles, languages: null } };
    };
    const classic = generate({ stack: hidden(["java", "postgresql"]), headings }).markdown;
    expect(classic).not.toContain("## Tecnologias");
    expect(classic).not.toContain("Linguagens");
    expect(classic).toContain("### Bancos de Dados");
    const minimal = generate({ template: "minimal", stack: hidden(["java"]), headings }).markdown;
    expect(minimal).toContain("# Olá, eu sou Mona \\*Lisa\\*\n\nJava\n\n");
  });
});

describe("escapeMarkdown", () => {
  it("escapes Markdown syntax, entities and mentions, and flattens line breaks", () => {
    expect(escapeMarkdown("a*b_c [x](y) <b> | #1 &lt; @mona\nnext")).toBe(
      "a\\*b\\_c \\[x\\](y) \\<b\\> \\| \\#1 \\&lt; \\@mona next",
    );
  });
});

describe("generateReadme safety", () => {
  it("keeps a multi-line greeting on the heading line", () => {
    const { markdown } = generate({ greeting: "Hi\n## Injected", sections: { ...defaultReadme("en").sections, contact: false } });
    expect(markdown.startsWith("# Hi ## Injected\n")).toBe(true);
  });

  it("encodes characters that would add mailto parameters", () => {
    const { markdown } = generate({}, { ...PROFILE, email: "a@b.c?bcc=x" });
    expect(markdown).toContain("(<mailto:a@b.c%3Fbcc=x>)");
  });
});

describe("section order", () => {
  it("keeps the greeting first and follows the draft's order for the rest", () => {
    const { markdown } = generate({ stack: stack(["java"]), order: ["contact", "technologies", "intro", "projects"] });
    expect(markdown.startsWith("# Olá")).toBe(true);
    expect(markdown.indexOf("## Contato")).toBeLessThan(markdown.indexOf("## Tecnologias"));
  });
});

describe("contact styles", () => {
  const profile: DraftProfile = {
    ...PROFILE,
    socialAccounts: ["https://www.linkedin.com/in/mona", "https://youtube.com/@mona", "https://example.social/mona"],
  };

  it("inline: one line of named links", () => {
    const { markdown } = generate({ contactStyle: "inline", language: "en" }, profile);
    expect(markdown).toContain(
      "[Website](<https://example.com>) • [Email](<mailto:mona@example.com>) • [X](<https://x.com/mona>) • " +
        "[LinkedIn](<https://www.linkedin.com/in/mona>) • [YouTube](<https://youtube.com/@mona>) • " +
        "[example.social](<https://example.social/mona>)",
    );
  });

  it("icons: brand icons for known networks, generic icons otherwise, white versions on dark themes", () => {
    const { markdown } = generate({ contactStyle: "icons" }, profile);
    expect(markdown).toContain(
      '<a href="mailto:mona@example.com" title="E-mail"><picture><source media="(prefers-color-scheme: dark)" ' +
        'srcset="https://api.iconify.design/mdi/email.svg?color=%23ffffff" />' +
        '<img src="https://api.iconify.design/mdi/email.svg?color=%231f2328" alt="E-mail" title="E-mail" width="32" height="32" /></picture></a>',
    );
    expect(markdown).toContain("https://api.iconify.design/mdi/web.svg?color=%231f2328");
    expect(markdown).toContain(
      '<a href="https://x.com/mona" title="X"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.simpleicons.org/x/white" />',
    );
    expect(markdown).toContain(
      '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/linkedin/linkedin-original.svg" alt="LinkedIn" title="LinkedIn" width="32" height="32" />',
    );
    expect(markdown).toContain(
      '<img src="https://api.iconify.design/mdi/link-variant.svg?color=%231f2328" alt="example.social" title="example.social" width="32" height="32" />',
    );
    expect(markdown).not.toMatch(/>(✉️|🌐|🔗)</);
  });

  it("escapes link values inside the HTML styles", () => {
    const { markdown } = generate({ contactStyle: "icons" }, { ...PROFILE, blog: 'example.com/"><script>', socialAccounts: [] });
    expect(markdown).not.toContain("<script>");
    expect(markdown).toContain("&quot;&gt;&lt;script&gt;");
  });
});

describe("contact title", () => {
  it("can be hidden so the links follow the previous section directly", () => {
    const { markdown } = generate({
      contactStyle: "inline",
      headings: { ...defaultReadme("pt-BR").headings, contact: null },
      intro: "Texto",
      order: ["intro", "contact", "technologies", "projects"],
    });
    expect(markdown).not.toContain("## Contato");
    expect(markdown).toContain("Texto\n\n[Site](<https://example.com>) • ");
  });
});
