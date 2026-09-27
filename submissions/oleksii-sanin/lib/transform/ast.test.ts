import { describe, expect, it } from "vitest";
import { graphemes, splitGraphemes } from "./ast";

const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}";

// Review finding 3.1: a count by code unit and a split by code point both passed the suite.
describe("The grapheme helpers hold the Intl.Segmenter decision", () => {
  it("counts a family emoji as one grapheme", () => {
    expect(graphemes(`a${FAMILY}`)).toBe(2);
  });

  it("never cuts inside a family emoji", () => {
    expect(splitGraphemes(`a${FAMILY}${FAMILY}`, 2)).toEqual([`a${FAMILY}`, FAMILY]);
  });
});
