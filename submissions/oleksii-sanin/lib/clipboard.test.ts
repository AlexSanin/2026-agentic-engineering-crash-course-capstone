import { afterEach, describe, expect, it, vi } from "vitest";
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

/** The stand-in for the browser class. Node has no `ClipboardItem`. */
class FakeItem {
  constructor(readonly entries: Record<string, Blob>) {}
}

describe("The Google Docs tab copies rich text", () => {
  afterEach(() => void vi.unstubAllGlobals());

  it("writes one item with a text/html entry and a text/plain entry", async () => {
    vi.stubGlobal("ClipboardItem", FakeItem);
    const written: FakeItem[] = [];
    const clipboard = {
      writeText: () => Promise.reject(new Error("plain text only")),
      write: async (items: ClipboardItem[]) => void written.push(...(items as unknown as FakeItem[])),
    };

    const status = await copy("## Setup", clipboard, "<h2>Setup</h2>");

    expect(status).toBe("copied");
    expect(written).toHaveLength(1);
    expect(Object.keys(written[0].entries).sort()).toEqual(["text/html", "text/plain"]);
    expect(await written[0].entries["text/html"].text()).toBe("<h2>Setup</h2>");
    expect(await written[0].entries["text/plain"].text()).toBe("## Setup");
  });

  it("reports failed when the browser has no ClipboardItem", async () => {
    const clipboard = { writeText: async () => {}, write: async () => {} };

    expect(await copy("## Setup", clipboard, "<h2>Setup</h2>")).toBe("failed");
  });
});
