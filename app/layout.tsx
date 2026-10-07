import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    // Pages set their own title; it becomes "<page> · GitHub Profile Builder".
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const t = await getTranslations("layout");
  const user = await getCurrentUser();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
          >
            {t("skipToContent")}
          </a>

          <header className="border-b border-border">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2 text-sm font-semibold tracking-tight sm:text-base">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-accent" />
                GitHub Profile Builder
              </Link>
              <div className="flex items-center gap-2">
                {user && <UserMenu user={user} />}
                <LocaleSwitcher />
              </div>
            </div>
          </header>

          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>

          <footer className="border-t border-border">
            <p className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted sm:px-6">
              {t("footer")}
            </p>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
