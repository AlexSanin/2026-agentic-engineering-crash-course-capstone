import { describe, expect, it } from "vitest";
import { transform } from "./index";

const GRAPHEMES = new Intl.Segmenter("en", { granularity: "grapheme" });
const count = (text: string): number => [...GRAPHEMES.segment(text)].length;

/** A part without its trailing `n/total` counter. */
const body = (part: string): string => part.replace(/\n\n\d+\/\d+$/, "");

/** One sentence of about 100 characters, ending with a full stop. */
const sentence = (n: number): string => `Sentence ${n} ${"word ".repeat(17)}ends here.`;

const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}";

describe("The X thread splits at sentence boundaries", () => {
  it("gives one part for short input, and it counts 1/1", () => {
    const { x } = transform(sentence(1));

    expect(x).toHaveLength(1);
    expect(x[0]).toMatch(/\n\n1\/1$/);
    expect(count(x[0])).toBeLessThanOrEqual(280);
  });

  it("splits long input on sentences", () => {
    const source = [1, 2, 3, 4, 5, 6].map(sentence).join(" ");

    const { x } = transform(source);

    expect(x.length).toBeGreaterThan(1);
    for (const part of x) {
      expect(count(part)).toBeLessThanOrEqual(280);
      expect(body(part).trimEnd()).toMatch(/\.$/);
    }
    // The packing is greedy: a part carries as many sentences as fit. Without this bound a
    // splitter that emitted one sentence per part would satisfy every assertion above.
    for (const part of x.slice(0, -1)) expect(count(part)).toBeGreaterThan(150);
  });

  it("splits a sentence longer than the limit at a word boundary", () => {
    const source = `${"word ".repeat(79)}end`;

    const { x } = transform(source);

    expect(x.length).toBeGreaterThan(1);
    for (const part of x) expect(count(part)).toBeLessThanOrEqual(280);
    // No part cuts a word: the words of all parts, in order, are the words of the source.
    const words = x.flatMap((part) => body(part).split(/\s+/).filter(Boolean));
    expect(words).toEqual(source.split(/\s+/).filter(Boolean));
  });

  it("keeps a family emoji whole and counts it as one grapheme", () => {
    const source = `${[1, 2, 3].map(sentence).join(" ")} The end is here ${FAMILY}.`;

    const { x } = transform(source);

    const holder = x.filter((part) => part.includes(FAMILY));
    expect(holder).toHaveLength(1);
    for (const part of x) expect(count(part)).toBeLessThanOrEqual(280);
  });

  it("gives a fenced code block its own part", () => {
    const source = [
      "A paragraph before the code.",
      "",
      "```ts",
      "const a = 1;",
      "const b = 2;",
      "const c = 3;",
      "const d = 4;",
      "const e = 5;",
      "```",
      "",
    ].join("\n");

    const { x } = transform(source);

    const codeParts = x.filter((part) => part.includes("const a = 1;"));
    expect(codeParts).toHaveLength(1);
    expect(codeParts[0]).toContain("const e = 5;");
    expect(codeParts[0]).not.toContain("A paragraph before the code.");

    const textParts = x.filter((part) => part.includes("A paragraph before the code."));
    expect(textParts).toHaveLength(1);
    expect(textParts[0]).not.toContain("const a = 1;");
  });
});
