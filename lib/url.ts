// Profile fields are free text: link only http(s) URLs or scheme-less hosts
// ("example.com"); anything else (mailto:, javascript:, ...) is not a link.
export function toSafeHref(value: string): string | null {
  if (/^https?:\/\//i.test(value)) return value;
  // "name:" not followed by a port number is a scheme ("mailto:", "javascript:");
  // "example.com:8080" is a host with a port.
  const hasScheme = /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(value);
  return hasScheme ? null : `https://${value}`;
}

/** True when a social account URL is the same X (Twitter) profile as the X username field. */
export function isSameXAccount(url: string, username: string): boolean {
  if (!username) return false;
  const match = /^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})\/?$/i.exec(url.trim());
  return match !== null && match[1].toLowerCase() === username.toLowerCase();
}

/** Short label for a URL: no protocol, no trailing slash. */
export function toUrlLabel(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
