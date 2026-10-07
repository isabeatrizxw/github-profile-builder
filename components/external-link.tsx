import { toSafeHref, toUrlLabel } from "@/lib/url";

/** `newTab` keeps the user on the page, e.g. inside the editor preview. */
export function ExternalLink({ value, newTab = false }: { value: string; newTab?: boolean }) {
  const href = toSafeHref(value);
  if (!href) return <span className="break-all">{value}</span>;
  return (
    <a href={href} rel="noopener noreferrer" target={newTab ? "_blank" : undefined} className="break-all underline underline-offset-4">
      {toUrlLabel(value)}
    </a>
  );
}
