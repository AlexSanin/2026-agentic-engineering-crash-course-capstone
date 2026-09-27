import { describe, expect, it } from "vitest";
import { copy } from "./clipboard";

// docs/reviews/2026-09-27-task-6-5-fixes.md, finding 10.
describe("The copy action reports its outcome", () => {
  it("writes the text, and reports copied", async () => {
    const written: string[] = [];

    const status = await copy("part 2", { writeText: async (text) => void written.push(text) });

    expect(status).toBe("copied");
    expect(written).toEqual(["part 2"]);
  });

  it("reports failed when the clipboard rejects", async () => {
    const status = await copy("part 2", { writeText: () => Promise.reject(new Error("denied")) });

    expect(status).toBe("failed");
  });

  it("reports failed when the browser has no clipboard API", async () => {
    expect(await copy("part 2", undefined)).toBe("failed");
  });
});
