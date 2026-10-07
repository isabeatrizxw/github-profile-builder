import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVerifiedEmails } from "./emails";
import { mockGitHub } from "./test-utils";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchVerifiedEmails", () => {
  it("returns only verified addresses", async () => {
    mockGitHub([
      [
        "/user/emails",
        {
          body: [
            { email: "mona@example.com", verified: true, primary: true },
            { email: "old@example.com", verified: false, primary: false },
          ],
        },
      ],
    ]);

    await expect(fetchVerifiedEmails("gho_test")).resolves.toEqual(["mona@example.com"]);
  });

  it("throws on an unexpected response", async () => {
    mockGitHub([["/user/emails", { status: 404 }]]);

    await expect(fetchVerifiedEmails("gho_test")).rejects.toThrow("Unexpected response");
  });
});
