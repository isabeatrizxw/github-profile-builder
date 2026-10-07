import type { DraftProfile } from "@/lib/drafts/content";
import { isSameXAccount, toSafeHref, toUrlLabel } from "@/lib/url";
import { singleLine, type ContactStyle, type DraftReadme, type HeadingId } from "./config";
import { customSectionId, type SectionContent, type SectionKey } from "./custom-sections";
import { readmeMarker } from "./marker";
import { EMAIL_ICON, findSocialNetwork, LINK_ICON, linkHost, WEBSITE_ICON, X_NETWORK, type ContactIcon } from "./social";
import { README_STRINGS } from "./strings";
import {
  findTechnology,
  TECHNOLOGY_CATEGORIES,
  technologyDarkIconUrl,
  technologyIconUrl,
  type Technology,
} from "./technologies";
import type { SectionId, TemplateId } from "./templates";

// The single README generator. The editor preview and the GitHub apply step
// both call generateReadme, so what is previewed is exactly what is published.
// Pure function: no I/O, same input -> same Markdown.

/** Real repository data for the selected projects (read from GitHub). */
export type ReadmeProject = {
  fullName: string;
  name: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
};

export type ReadmeInput = {
  readme: DraftReadme;
  profile: DraftProfile;
  login: string;
  /** The user's repositories; selected projects missing here are skipped. */
  repositories: ReadmeProject[];
};

export type ReadmeOutput = {
  markdown: string;
  /** Selected projects not found among the user's repositories. */
  missingProjects: string[];
};

type Context = ReadmeInput & { strings: (typeof README_STRINGS)[keyof typeof README_STRINGS] };

// GitHub data (names, descriptions) is plain text: escape Markdown syntax,
// HTML entities and "@" (GitHub would turn @name into a mention that pings).
// The user's own texts (greeting, intro, about) are Markdown on purpose.
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>|#~&@]/g, "\\$&").replace(/\s*[\r\n\t]+\s*/g, " ");
}

function escapeHtmlAttribute(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Angle brackets let the URL contain characters like ")" safely.
function link(label: string, url: string): string {
  return `[${label}](<${url.replace(/[<>\s]/g, (char) => encodeURIComponent(char))}>)`;
}

function technologyIcon(technology: Technology, size: number): string {
  const alt = escapeHtmlAttribute(technology.name);
  const img = `<img src="${technologyIconUrl(technology)}" alt="${alt}" title="${alt}" width="${size}" height="${size}" />`;
  const dark = technologyDarkIconUrl(technology);
  // GitHub shows the <source> image to readers using the dark theme.
  return dark
    ? `<picture><source media="(prefers-color-scheme: dark)" srcset="${dark}" />${img}</picture>`
    : img;
}

// A custom heading (single line, Markdown allowed), the recommended default
// when blank, or null when the user removed the title.
function heading(ctx: Context, id: HeadingId, fallback: string): string | null {
  const custom = ctx.readme.headings[id];
  if (custom === null) return null;
  return singleLine(custom ?? "") || fallback;
}

function sectionTitle(ctx: Context, id: HeadingId, fallback: string): string | null {
  const title = heading(ctx, id, fallback);
  return title === null ? null : `## ${title}`;
}

/** Joins Markdown blocks, leaving out the missing ones (such as a hidden title). */
function joinBlocks(...blocks: (string | null)[]): string {
  return blocks.filter((block): block is string => block !== null).join("\n\n");
}

function catalogTechnologies(ids: string[]): Technology[] {
  return ids.map(findTechnology).filter((tech): tech is Technology => tech !== undefined);
}

function greeting({ readme, profile, login, strings }: Context): string {
  const text = singleLine(readme.greeting) || strings.greeting(escapeMarkdown(profile.name || login));
  return `# ${text}`;
}

/**
 * A section's technologies in the template's style: names only in "minimal",
 * icons otherwise; in one list, or grouped under the section's category titles.
 */
function technologyBody(ctx: Context, template: TemplateId, section: SectionContent, selected: Technology[]): string {
  const list = (items: Technology[]) =>
    template === "minimal"
      ? items.map((tech) => tech.name).join(" · ")
      : `<p>\n${items.map((tech) => technologyIcon(tech, template === "compact" ? 32 : 40)).join("\n")}\n</p>`;
  if (!section.groupByCategory) return list(selected);

  const groups = TECHNOLOGY_CATEGORIES.map((category) => {
    const custom = section.categoryTitles[category];
    return {
      // null hides the title; "" uses the recommended one in the README language.
      title: custom === null ? null : singleLine(custom) || ctx.strings.categories[category],
      items: selected.filter((tech) => tech.category === category),
    };
  }).filter((group) => group.items.length > 0);
  const titled = (title: string | null) =>
    title === null ? null : template === "minimal" ? `**${title}**` : `### ${title}`;
  return joinBlocks(...groups.map((group) => joinBlocks(titled(group.title), list(group.items))));
}

/** Text, then technologies; null when the section has neither. */
function contentBody(ctx: Context, template: TemplateId, content: SectionContent): string | null {
  const selected = catalogTechnologies(content.technologies);
  const body = joinBlocks(
    content.text || null,
    selected.length > 0 ? technologyBody(ctx, template, content, selected) : null,
  );
  return body || null;
}

function stack(ctx: Context, template: TemplateId): string | null {
  const body = contentBody(ctx, template, ctx.readme.stack);
  return body && joinBlocks(sectionTitle(ctx, "technologies", ctx.strings.headings.technologies), body);
}

function customSection(ctx: Context, template: TemplateId, id: string): string | null {
  const section = ctx.readme.customSections.find((item) => item.id === id);
  const body = section && contentBody(ctx, template, section);
  if (!section || !body) return null;
  const title = singleLine(section.title);
  return joinBlocks(title ? `## ${title}` : null, body);
}

function resolveProjects({ readme, repositories }: ReadmeInput): ReadmeProject[] {
  const byName = new Map(repositories.map((repo) => [repo.fullName.toLowerCase(), repo]));
  return readme.projects
    .map((fullName) => byName.get(fullName.toLowerCase()))
    .filter((repo): repo is ReadmeProject => repo !== undefined);
}

function projects(ctx: Context, template: TemplateId): string | null {
  const resolved = resolveProjects(ctx);
  if (resolved.length === 0) return null;
  const title = sectionTitle(ctx, "projects", ctx.strings.headings.projects);

  if (template === "compact") {
    const { project, description, language } = ctx.strings.table;
    const rows = resolved.map((repo) =>
      `| ${link(escapeMarkdown(repo.name), repo.htmlUrl)} | ${escapeMarkdown(repo.description ?? "")} | ${escapeMarkdown(repo.language ?? "")} |`,
    );
    return joinBlocks(title, [`| ${project} | ${description} | ${language} |`, "| --- | --- | --- |", ...rows].join("\n"));
  }

  const items = resolved.map((repo) => {
    const name = escapeMarkdown(repo.name);
    const title = template === "minimal" ? link(name, repo.htmlUrl) : link(`**${name}**`, repo.htmlUrl);
    const description = repo.description ? ` — ${escapeMarkdown(repo.description)}` : "";
    const language = template === "classic" && repo.language ? ` · \`${repo.language.replace(/`/g, "")}\`` : "";
    return `- ${title}${description}${language}`;
  });
  return joinBlocks(title, items.join("\n"));
}

/** One contact link, with what every contact style needs to show it. */
type ContactLink = {
  /** Emoji used by the list style. */
  emoji: string;
  /** Escaped Markdown label of the list style. */
  listLabel: string;
  /** Plain-text name for the inline and icon styles. */
  name: string;
  href: string;
  /** Image for the icon style: the network's logo, or a generic web/email/link icon. */
  icon: ContactIcon;
};

function contactLinks({ profile, strings }: Context): ContactLink[] {
  const links: ContactLink[] = [];
  const blog = profile.blog && toSafeHref(profile.blog);
  if (blog) {
    const listLabel = escapeMarkdown(toUrlLabel(profile.blog));
    links.push({ emoji: "🌐", listLabel, name: strings.contactLabels.website, href: blog, icon: WEBSITE_ICON });
  }
  if (profile.email) {
    // Percent-encode so "?", "&" or "#" in an address cannot add mailto parameters.
    const address = profile.email.replace(/[?#&%"]/g, (char) => encodeURIComponent(char));
    const listLabel = escapeMarkdown(profile.email);
    links.push({ emoji: "✉️", listLabel, name: strings.contactLabels.email, href: `mailto:${address}`, icon: EMAIL_ICON });
  }
  if (profile.twitterUsername) {
    const href = `https://x.com/${encodeURIComponent(profile.twitterUsername)}`;
    // "\@" keeps GitHub from turning the X handle into a GitHub @mention.
    const listLabel = `\\@${escapeMarkdown(profile.twitterUsername)}`;
    links.push({ emoji: "𝕏", listLabel, name: X_NETWORK.name, href, icon: X_NETWORK });
  }
  for (const url of profile.socialAccounts) {
    // GitHub also lists the X username as a social account: show it once.
    if (isSameXAccount(url, profile.twitterUsername)) continue;
    const href = toSafeHref(url);
    if (!href) continue;
    const network = findSocialNetwork(url);
    const name = network?.name ?? linkHost(url) ?? toUrlLabel(url);
    links.push({ emoji: "🔗", listLabel: escapeMarkdown(toUrlLabel(url)), name, href, icon: network ?? LINK_ICON });
  }
  return links;
}

function contactIcon(icon: ContactIcon, name: string, size: number): string {
  const alt = escapeHtmlAttribute(name);
  const img = `<img src="${escapeHtmlAttribute(icon.iconUrl)}" alt="${alt}" title="${alt}" width="${size}" height="${size}" />`;
  return icon.darkIconUrl
    ? `<picture><source media="(prefers-color-scheme: dark)" srcset="${escapeHtmlAttribute(icon.darkIconUrl)}" />${img}</picture>`
    : img;
}

// The icon styles are HTML (Markdown is not parsed inside it), so every
// value is escaped for HTML instead of Markdown.
function iconLink(item: ContactLink): string {
  const href = escapeHtmlAttribute(item.href);
  const name = escapeHtmlAttribute(item.name);
  return `<a href="${href}" title="${name}">${contactIcon(item.icon, item.name, 32)}</a>`;
}

function renderContactLinks(links: ContactLink[], style: ContactStyle): string {
  switch (style) {
    case "list":
      return links.map((item) => `- ${item.emoji} ${link(item.listLabel, item.href)}`).join("\n");
    case "inline":
      return links.map((item) => link(escapeMarkdown(item.name), item.href)).join(" • ");
    case "icons":
      return `<p>\n${links.map(iconLink).join("\n")}\n</p>`;
  }
}

function contact(ctx: Context): string | null {
  const links = contactLinks(ctx);
  if (links.length === 0) return null;
  const title = sectionTitle(ctx, "contact", ctx.strings.headings.contact);
  return joinBlocks(title, renderContactLinks(links, ctx.readme.contactStyle));
}

function renderSection(key: "greeting" | SectionKey, ctx: Context, template: TemplateId): string | null {
  const { readme, strings } = ctx;
  const customId = key === "greeting" ? null : customSectionId(key);
  // Custom sections are removed instead of switched off.
  if (customId !== null) return customSection(ctx, template, customId);
  const section = key as SectionId;
  if (!readme.sections[section]) return null;
  switch (section) {
    case "greeting":
      return greeting(ctx);
    case "intro":
      return readme.intro ? joinBlocks(sectionTitle(ctx, "intro", strings.headings.intro), readme.intro) : null;
    case "technologies":
      return stack(ctx, template);
    case "projects":
      return projects(ctx, template);
    case "contact":
      return contact(ctx);
  }
}

/** Builds the profile README Markdown. Disabled or empty sections are left out. */
export function generateReadme(input: ReadmeInput): ReadmeOutput {
  const { readme } = input;
  const ctx: Context = { ...input, strings: README_STRINGS[readme.language] };
  const sections: ("greeting" | SectionKey)[] = ["greeting", ...readme.order];

  const blocks = sections
    .map((section) => renderSection(section, ctx, readme.template))
    .filter((block): block is string => Boolean(block));

  const found = new Set(resolveProjects(input).map((repo) => repo.fullName.toLowerCase()));
  const missingProjects = readme.sections.projects
    ? readme.projects.filter((name) => !found.has(name.toLowerCase()))
    : [];

  // The invisible marker lets a future draft start from this README.
  const markdown = `${[...blocks, readmeMarker(readme)].join("\n\n")}\n`;
  return { markdown, missingProjects };
}
