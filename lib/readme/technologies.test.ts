import { describe, expect, it } from "vitest";
import { findTechnology, TECHNOLOGIES, TECHNOLOGY_CATEGORIES, technologyIconUrl } from "./technologies";

describe("technology catalog", () => {
  it("has unique ids and a valid category for every entry", () => {
    const ids = TECHNOLOGIES.map((tech) => tech.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tech of TECHNOLOGIES) {
      expect(TECHNOLOGY_CATEGORIES).toContain(tech.category);
    }
  });

  it("builds pinned Devicon CDN URLs", () => {
    const java = findTechnology("java");
    expect(java && technologyIconUrl(java)).toBe(
      "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/java/java-original.svg",
    );
  });
});
