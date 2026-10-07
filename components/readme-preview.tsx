"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { renderReadmePreviewAction, type ReadmePreviewResult } from "@/app/drafts/actions";
import { secondaryButton } from "./button-styles";

// Wait for a pause in typing before asking GitHub to render.
const DEBOUNCE_MS = 600;
const COPY_STATUS_MS = 3000;

type View = "visual" | "markdown";
type Rendered = { markdown: string; result: ReadmePreviewResult };

export function ReadmePreview({ markdown, missingProjects }: { markdown: string; missingProjects: string[] }) {
  const t = useTranslations("readmePreview");
  const [view, setView] = useState<View>("visual");
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [lastHtml, setLastHtml] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const isEmpty = markdown.trim() === "";

  useEffect(() => {
    if (isEmpty) return;
    // Set by the cleanup: answers for Markdown that has since changed are ignored.
    let cancelled = false;
    // Called outside startTransition so a slow preview never delays a save.
    const timer = setTimeout(async () => {
      let result: ReadmePreviewResult;
      try {
        result = await renderReadmePreviewAction(markdown);
      } catch {
        // Network failure or server restart: show an error, keep the editor alive.
        result = { status: "error", reason: "github" };
      }
      if (cancelled) return;
      setRendered({ markdown, result });
      if (result.status === "ok") setLastHtml(result.html);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [markdown, isEmpty]);

  const isUpdating = !isEmpty && rendered?.markdown !== markdown;
  const error = rendered?.result.status === "error" ? rendered.result.reason : null;

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), COPY_STATUS_MS);
    } catch {
      setCopyStatus("failed");
      setTimeout(() => setCopyStatus("idle"), COPY_STATUS_MS);
    }
  }

  // Preview links open in a new tab so unsaved editor changes are not lost.
  // Only web links are followed; mailto: and anything else are ignored here.
  function openLinksInNewTab(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor?.href || anchor.getAttribute("href")?.startsWith("#")) return;
    event.preventDefault();
    const { protocol } = new URL(anchor.href);
    if (protocol === "http:" || protocol === "https:") {
      window.open(anchor.href, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label={t("viewLabel")} className="flex rounded-lg border border-border p-0.5">
          {(["visual", "markdown"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className="min-h-11 rounded-md px-3 text-sm font-medium text-muted aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {t(option)}
            </button>
          ))}
        </div>
        <button type="button" onClick={copyMarkdown} className={secondaryButton}>
          {t("copy")}
        </button>
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted">
        {copyStatus === "copied" ? t("copied") : copyStatus === "failed" ? t("copyFailed") : ""}
      </p>

      {missingProjects.length > 0 && (
        <p className="text-sm">{t("missingProjects", { count: missingProjects.length, names: missingProjects.join(", ") })}</p>
      )}

      {isEmpty ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : view === "markdown" ? (
        <pre tabIndex={0} role="region" aria-label={t("markdown")} className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-background p-4 text-xs leading-5">
          <code>{markdown}</code>
        </pre>
      ) : (
        <>
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{t(`errors.${error}`)}</p>}
          {isUpdating && <p className="text-sm text-muted">{t("updating")}</p>}
          {/* HTML produced and sanitized by GitHub's Markdown API. */}
          <div
            tabIndex={0}
            role="region"
            aria-label={t("visual")}
            aria-busy={isUpdating}
            className="markdown-body max-h-[70vh] overflow-auto rounded-lg border border-border bg-background p-4"
            onClick={openLinksInNewTab}
            dangerouslySetInnerHTML={{ __html: lastHtml }}
          />
        </>
      )}
    </div>
  );
}
