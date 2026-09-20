import { describe, expect, it } from "vitest";
import { transform } from "./index";

/** One sentence of about 100 characters, ending with a full stop. */
const sentence = (n: number): string => `Sentence ${n} ${"word ".repeat(17)}ends here.`;

describe("LinkedIn output is plain text", () => {
  it("removes the emphasis marks", () => {
    const { linkedin } = transform("A **bold** word and an _italic_ word.\n");

    expect(linkedin).toContain("bold");
    expect(linkedin).toContain("italic");
    expect(linkedin).not.toContain("*");
    expect(linkedin).not.toContain("_");
  });

  it("removes the heading marks", () => {
    const { linkedin } = transform("## A heading\n\nA paragraph.\n");

    expect(linkedin).toContain("A heading");
    expect(linkedin).not.toContain("#");
  });

  it("moves a link to its own line", () => {
    const { linkedin } = transform("Read the [docs](https://example.com/a?b=1) today.\n");

    const lines = linkedin.split("\n");
    expect(lines[0]).toBe("Read the docs today.");
    expect(lines[1]).toBe("https://example.com/a?b=1");
  });

  it("cuts long input at the last complete sentence under 3000 characters", () => {
    const source = Array.from({ length: 40 }, (_, i) => sentence(i + 1)).join(" ");
    expect(source.length).toBeGreaterThan(3000);

    const { linkedin, meta } = transform(source);

    expect(linkedin.length).toBeLessThanOrEqual(3000);
    // The cut sits at the LAST sentence under the limit, not at an early one. Without this
    // bound a limit of 300, or of 10, would satisfy every other assertion here.
    expect(linkedin.length).toBeGreaterThan(2800);
    expect(linkedin.trimEnd()).toMatch(/\.$/);
    expect(meta.linkedin.truncated).toBe(true);
    // The cut keeps whole sentences: the text is a prefix of the source.
    expect(source.startsWith(linkedin.trimEnd())).toBe(true);
  });

  it("marks short input as not truncated", () => {
    const { linkedin, meta } = transform(sentence(1));

    expect(meta.linkedin.truncated).toBe(false);
    expect(meta.linkedin.chars).toBe(linkedin.length);
  });
});
