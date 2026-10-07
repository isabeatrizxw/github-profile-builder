// Shared Tailwind classes for buttons and button-like links.

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export const primaryButton = `${base} bg-accent text-accent-foreground hover:bg-accent-hover`;

export const secondaryButton = `${base} border border-border bg-surface text-foreground hover:bg-background`;

export const quietButton = `${base} font-medium text-muted hover:text-foreground`;

/** Failure messages: visually distinct from informational notes. */
export const alertBox =
  "rounded-lg border border-red-600 bg-surface px-4 py-3 text-sm text-red-700 dark:border-red-400 dark:text-red-400";
