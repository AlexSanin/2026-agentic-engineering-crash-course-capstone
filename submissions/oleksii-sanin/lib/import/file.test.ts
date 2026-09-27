import { describe, expect, it } from "vitest";
import { importKind, MAX_FILE_BYTES } from "./file";

describe("A local file opens into the textarea", () => {
  it.each([
    ["post.md", "markdown"],
    ["post.markdown", "markdown"],
    ["notes.txt", "markdown"],
    ["page.html", "html"],
    ["draft.docx", "docx"],
    ["DRAFT.DOCX", "docx"],
  ])("routes %s to the %s path", (name, kind) => {
    expect(importKind(name, 10)).toEqual({ kind });
  });

  it.each(["md", "x.constructor", "post.md.png"])("refuses %s", (name) => {
    expect(importKind(name, 10)).toHaveProperty("error");
  });

  it("refuses an unsupported file, and names the supported extensions", () => {
    const result = importKind("photo.png", 10);

    expect(result).toHaveProperty("error");
    for (const extension of [".md", ".markdown", ".txt", ".html", ".docx"]) {
      expect(result).toHaveProperty("error", expect.stringContaining(extension));
    }
  });

  it("refuses a file of 2 MB, and names the 1 MB limit", () => {
    expect(importKind("post.md", 2 * 1024 * 1024)).toEqual({ error: expect.stringContaining("1 MB") });
  });

  it("accepts a file of exactly 1 MB", () => {
    expect(MAX_FILE_BYTES).toBe(1024 * 1024);
    expect(importKind("post.md", MAX_FILE_BYTES)).toEqual({ kind: "markdown" });
  });
});
