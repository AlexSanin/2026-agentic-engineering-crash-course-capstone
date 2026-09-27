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

  // Review finding 1.2, docs/reviews/2026-09-20-lib-transform-groups-2-3.md.
  it("splits a word longer than a part from the part in progress", () => {
    const source = `See https://example.com/${"a".repeat(400)} now.`;

    const { x } = transform(source);

    // 429 graphemes fit in two parts of 275. The broken split gave three: the first part held
    // the 24 graphemes before the long word and nothing else.
    expect(x).toHaveLength(2);
    expect(count(body(x[0]))).toBe(275);
  });

  it("keeps a family emoji whole and counts it as one grapheme", () => {
    const source = `${[1, 2, 3].map(sentence).join(" ")} The end is here ${FAMILY}.`;

    const { x } = transform(source);

    const holder = x.filter((part) => part.includes(FAMILY));
    expect(holder).toHaveLength(1);
    for (const part of x) expect(count(part)).toBeLessThanOrEqual(280);
  });

  it("keeps a URL whole when it lands at the limit", () => {
    const url = "https://example.com/a-fairly-long-path/for-the-limit-case?q=1";
    const source = `${"word ".repeat(48)}ends here. Read [the docs](${url}) now.`;

    const { x } = transform(source);

    expect(x.length).toBeGreaterThan(1);
    // Part 1 is nearly full, so the URL moved because of the limit and not for some other
    // reason. Without this bound the case would pass even if the parts split anywhere.
    expect(count(x[0])).toBeGreaterThan(200);
    expect(x[0]).not.toContain("https://");
    // The URL sits in exactly one part, uncut. A split inside it would give two parts that
    // each hold a piece, and neither piece would be a link any more.
    expect(x.filter((part) => part.includes(url))).toHaveLength(1);
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

  // Review finding 1.3, docs/reviews/2026-09-20-lib-transform-groups-2-3.md.
  it("splits a code line longer than the limit with no part that holds only a fence", () => {
    const source = ["```js", `const x = "${"y".repeat(400)}";`, "```", ""].join("\n");

    const { x } = transform(source);

    for (const part of x) expect(body(part).trim()).not.toMatch(/^`{3}\w*$/);
    // The block is 421 graphemes with its fences, and a part holds 275 before the counter.
    // Two parts are enough. The broken split gave four: a fence, two pieces, a fence.
    expect(x).toHaveLength(2);
    expect(body(x[0])).toMatch(/^```/);
    expect(body(x[1])).toMatch(/```$/);
    for (const part of x) expect(count(part)).toBeLessThanOrEqual(280);
  });

  // The open edge of finding 1.3: a line of 546 filled two parts exactly, and the closing
  // fence got a part of its own. 534 fills two parts exactly under the re-fenced split.
  it.each([400, 534, 546])("fences each piece of a code line of %i characters", (n) => {
    const line = "y".repeat(n);

    const { x } = transform(["```", line, "```", ""].join("\n"));

    for (const part of x) expect(body(part)).toMatch(/^```\ny+\n```$/);
    expect(x.map((part) => body(part).slice(4, -4)).join("")).toBe(line);
    for (const part of x) expect(count(part)).toBeLessThanOrEqual(280);
  });

  // Review finding 1.4: parts 3 to 6 lost the opening fence, and the indent of their first line.
  it("keeps the fences and the indent on every piece of a long code block", () => {
    const lines = Array.from({ length: 30 }, (_, i) => `    const value${i} = ${i};`);

    const { x } = transform(["```ts", ...lines, "```", ""].join("\n"));

    expect(x.length).toBeGreaterThan(2);
    for (const part of x) expect(body(part)).toMatch(/^```\n {4}const [^]*\n```$/);
    expect(x.flatMap((part) => body(part).split("\n").slice(1, -1))).toEqual(lines);
  });
});
