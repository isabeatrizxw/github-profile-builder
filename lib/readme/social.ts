import { toSafeHref } from "@/lib/url";
import { DEVICON_VERSION } from "./technologies";

// Social networks recognized from a link's host, for the contact icons.
// Icons come from Simple Icons (https://simpleicons.org, CC0-1.0) in each
// brand's color; near-black logos get a white version for GitHub's dark theme.
// LinkedIn is not in Simple Icons, so it uses Devicon, pinned like the
// technology icons. Every slug below was checked against both CDNs.

/** An icon image, with a light version for GitHub's dark theme when needed. */
export type ContactIcon = {
  iconUrl: string;
  darkIconUrl: string | null;
};

export type SocialNetwork = ContactIcon & {
  name: string;
  hosts: readonly string[];
};

// Website, email and unknown links: Material Design Icons (Apache-2.0) via the
// Iconify API, in GitHub's text color on each theme.
function genericIcon(name: string): ContactIcon {
  const url = (color: string) => `https://api.iconify.design/mdi/${name}.svg?color=${encodeURIComponent(color)}`;
  return { iconUrl: url("#1f2328"), darkIconUrl: url("#ffffff") };
}

export const WEBSITE_ICON = genericIcon("web");
export const EMAIL_ICON = genericIcon("email");
export const LINK_ICON = genericIcon("link-variant");

function simpleIcons(name: string, slug: string, hosts: string[], isDark = false): SocialNetwork {
  const iconUrl = `https://cdn.simpleicons.org/${slug}`;
  return { name, hosts, iconUrl, darkIconUrl: isDark ? `${iconUrl}/white` : null };
}

export const X_NETWORK = simpleIcons("X", "x", ["x.com", "twitter.com"], true);

const NETWORKS: readonly SocialNetwork[] = [
  X_NETWORK,
  {
    name: "LinkedIn",
    hosts: ["linkedin.com"],
    iconUrl: `https://cdn.jsdelivr.net/gh/devicons/devicon@v${DEVICON_VERSION}/icons/linkedin/linkedin-original.svg`,
    darkIconUrl: null,
  },
  simpleIcons("GitHub", "github", ["github.com"], true),
  simpleIcons("YouTube", "youtube", ["youtube.com", "youtu.be"]),
  simpleIcons("Instagram", "instagram", ["instagram.com"]),
  simpleIcons("Facebook", "facebook", ["facebook.com", "fb.com"]),
  simpleIcons("Reddit", "reddit", ["reddit.com"]),
  simpleIcons("Bluesky", "bluesky", ["bsky.app"]),
  simpleIcons("Mastodon", "mastodon", ["mastodon.social", "mastodon.online"]),
  simpleIcons("Twitch", "twitch", ["twitch.tv"]),
  simpleIcons("TikTok", "tiktok", ["tiktok.com"], true),
  simpleIcons("Threads", "threads", ["threads.net", "threads.com"], true),
  simpleIcons("DEV", "devdotto", ["dev.to"], true),
  simpleIcons("Medium", "medium", ["medium.com"], true),
  simpleIcons("Hashnode", "hashnode", ["hashnode.com", "hashnode.dev"]),
  simpleIcons("Substack", "substack", ["substack.com"]),
  simpleIcons("Stack Overflow", "stackoverflow", ["stackoverflow.com"]),
  simpleIcons("GitLab", "gitlab", ["gitlab.com"]),
  simpleIcons("npm", "npm", ["npmjs.com"]),
  simpleIcons("Kaggle", "kaggle", ["kaggle.com"]),
  simpleIcons("LeetCode", "leetcode", ["leetcode.com"]),
  simpleIcons("Behance", "behance", ["behance.net"]),
  simpleIcons("Dribbble", "dribbble", ["dribbble.com"]),
  simpleIcons("Discord", "discord", ["discord.com", "discord.gg"]),
  simpleIcons("Telegram", "telegram", ["t.me"]),
];

/** Host of a profile link without "www.", or null when it is not a web link. */
export function linkHost(url: string): string | null {
  const href = toSafeHref(url);
  if (!href) return null;
  try {
    return new URL(href).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** The known network a link points to (subdomains included), if any. */
export function findSocialNetwork(url: string): SocialNetwork | null {
  const host = linkHost(url);
  if (!host) return null;
  return NETWORKS.find((network) => network.hosts.some((known) => host === known || host.endsWith(`.${known}`))) ?? null;
}
