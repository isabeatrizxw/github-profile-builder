import { describe, expect, it } from "vitest";
import { findSocialNetwork, linkHost } from "./social";

describe("findSocialNetwork", () => {
  it("recognizes networks by host, with or without www and protocol, including subdomains", () => {
    expect(findSocialNetwork("https://www.linkedin.com/in/mona")?.name).toBe("LinkedIn");
    expect(findSocialNetwork("twitter.com/mona")?.name).toBe("X");
    expect(findSocialNetwork("https://mona.medium.com")?.name).toBe("Medium");
  });

  it("does not match look-alike hosts or non-web links", () => {
    expect(findSocialNetwork("https://notlinkedin.com/in/mona")).toBeNull();
    expect(findSocialNetwork("javascript:alert(1)")).toBeNull();
    expect(linkHost("mailto:mona@example.com")).toBeNull();
  });
});
