import type { TechnologyCategory } from "./technologies";
import type { ReadmeLanguage } from "./config";

// Fixed texts written into the README, in the README's own language
// (independent from the app's interface language).

type ReadmeStrings = {
  greeting: (name: string) => string;
  /** Recommended section titles ("intro" is "About me": its title starts hidden). */
  headings: { intro: string; technologies: string; projects: string; contact: string };
  categories: Record<TechnologyCategory, string>;
  table: { project: string; description: string; language: string };
  /** Link names for the website and email in the contact styles that show names. */
  contactLabels: { website: string; email: string };
};

export const README_STRINGS: Record<ReadmeLanguage, ReadmeStrings> = {
  "pt-BR": {
    greeting: (name) => `Olá, eu sou ${name}`,
    headings: { intro: "Sobre mim", technologies: "Tecnologias", projects: "Projetos", contact: "Contato" },
    categories: {
      languages: "Linguagens",
      frameworks: "Frameworks",
      databases: "Bancos de Dados",
      tools: "Ferramentas",
    },
    table: { project: "Projeto", description: "Descrição", language: "Linguagem" },
    contactLabels: { website: "Site", email: "E-mail" },
  },
  en: {
    greeting: (name) => `Hi, I'm ${name}`,
    headings: { intro: "About me", technologies: "Tech stack", projects: "Projects", contact: "Contact" },
    categories: {
      languages: "Languages",
      frameworks: "Frameworks",
      databases: "Databases",
      tools: "Tools",
    },
    table: { project: "Project", description: "Description", language: "Language" },
    contactLabels: { website: "Website", email: "Email" },
  },
};
