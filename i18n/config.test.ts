import { describe, expect, it } from "vitest";
import { isLocale, negotiateLocale } from "./config";

describe("negotiateLocale", () => {
  it("falls back to pt-BR without a header", () => {
    expect(negotiateLocale(null)).toBe("pt-BR");
  });

  it("maps any Portuguese variant to pt-BR", () => {
    expect(negotiateLocale("pt-PT,pt;q=0.9")).toBe("pt-BR");
  });

  it("respects quality order", () => {
    expect(negotiateLocale("pt;q=0.5,en-US;q=0.9")).toBe("en");
  });

  it("ignores languages marked as not acceptable (q=0)", () => {
    expect(negotiateLocale("en;q=0,pt;q=0.1")).toBe("pt-BR");
  });

  it("falls back to pt-BR for unsupported languages", () => {
    expect(negotiateLocale("fr-FR,de;q=0.8")).toBe("pt-BR");
  });
});

describe("isLocale", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("pt-BR")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
