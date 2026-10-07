import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { alertBox } from "@/components/button-styles";
import { GitHubSignInButton } from "@/components/github-sign-in-button";
import { getCurrentUser } from "@/lib/session";

const STEPS = ["connect", "edit", "apply"] as const;
const SIGN_IN_ERRORS = [
  "access_denied",
  "invalid_state",
  "oauth_failed",
  "session_expired",
] as const;

type SignInError = (typeof SIGN_IN_ERRORS)[number];

function toSignInError(value: string | string[] | undefined): SignInError | null {
  return SIGN_IN_ERRORS.find((code) => code === value) ?? null;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  if (await getCurrentUser()) redirect("/drafts");

  const t = await getTranslations("home");
  const error = toSignInError((await searchParams).error);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16 px-4 py-16 sm:px-6 sm:py-24">
      <section className="flex max-w-2xl flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-lg leading-8 text-muted text-pretty">
          {t("description")}
        </p>
        {error && (
          <p role="alert" className={alertBox}>
            {t(`errors.${error}`)}
          </p>
        )}
        <div className="flex flex-col items-start gap-3">
          <GitHubSignInButton />
          <p className="text-sm text-muted">{t("safetyNote")}</p>
        </div>
      </section>

      <section aria-labelledby="steps-title" className="flex flex-col gap-6">
        <h2 id="steps-title" className="text-sm font-semibold uppercase tracking-wider text-muted">
          {t("stepsTitle")}
        </h2>
        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, index) => (
            <li key={step} className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="font-mono text-sm text-accent">0{index + 1}</span>
              <h3 className="font-semibold">{t(`steps.${step}.title`)}</h3>
              <p className="text-sm leading-6 text-muted">
                {t(`steps.${step}.description`)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
