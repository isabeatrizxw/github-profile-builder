import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isLocale, LOCALE_COOKIE, negotiateLocale } from "./config";

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : negotiateLocale((await headers()).get("accept-language"));

  return {
    locale,
    // Dates are rendered on the server; without a fixed zone they would follow
    // the server clock (UTC on Vercel). The main audience is in Brazil.
    timeZone: "America/Sao_Paulo",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
