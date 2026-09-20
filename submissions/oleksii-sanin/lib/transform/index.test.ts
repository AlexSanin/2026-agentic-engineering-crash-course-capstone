import { describe, expect, it } from "vitest";
import { transform } from "./index";

const SOURCE = `# Title

A paragraph with a [link](https://example.com/a?b=1) in it.
`;

describe("One source, four outputs", () => {
  it("returns all four outputs together", () => {
    const result = transform(SOURCE);

    expect(result.blog).not.toBe("");
    expect(result.email).not.toBe("");
    expect(result.x.length).toBeGreaterThan(0);
    expect(result.linkedin).not.toBe("");
  });

  it("returns the same output for the same input", () => {
    expect(transform(SOURCE)).toEqual(transform(SOURCE));
  });

  it("returns empty outputs for an empty string, and throws nothing", () => {
    const result = transform("");

    expect(result.blog).toBe("");
    expect(result.email).toBe("");
    expect(result.x).toEqual([]);
    expect(result.linkedin).toBe("");
  });
});

describe("The result reports its own size", () => {
  const sentence = (n: number): string => `Sentence ${n} ${"word ".repeat(17)}ends here.`;

  it("counts the thread parts", () => {
    const { x, meta } = transform(Array.from({ length: 12 }, (_, i) => sentence(i + 1)).join(" "));

    expect(x.length).toBeGreaterThan(2);
    expect(meta.x.parts).toBe(x.length);
  });

  it("counts the characters of each output", () => {
    const result = transform(SOURCE);

    expect(result.meta.blog.chars).toBe(result.blog.length);
    expect(result.meta.email.chars).toBe(result.email.length);
    expect(result.meta.linkedin.chars).toBe(result.linkedin.length);
    expect(result.meta.x.chars).toBe(result.x.join("").length);
  });

  it("reports zero for every output of an empty source", () => {
    const { meta } = transform("");

    expect(meta).toEqual({
      blog: { chars: 0 },
      email: { chars: 0 },
      x: { parts: 0, chars: 0 },
      linkedin: { chars: 0, truncated: false },
    });
  });
});
