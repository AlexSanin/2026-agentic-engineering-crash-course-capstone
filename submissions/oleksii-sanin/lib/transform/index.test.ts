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
