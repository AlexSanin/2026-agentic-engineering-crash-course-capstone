/**
 * One markdown source, four channel outputs.
 *
 * This module is pure. It imports no React and no Next, so `app/api/transform/route.ts`
 * stays thin and every rule below is testable without a browser and without a server.
 */

export type TransformResult = {
  /** Blog HTML. Headings, fenced code, lists and links keep their structure. */
  blog: string;
  /** Email HTML. Every element carries a `style` attribute, because Gmail strips `<style>`. */
  email: string;
  /** X thread parts. Each part holds 280 graphemes or fewer and carries an `n/total` counter. */
  x: string[];
  /** LinkedIn plain text. No emphasis marks, each URL on its own line, 3000 characters or fewer. */
  linkedin: string;
  meta: TransformMeta;
};

export type TransformMeta = {
  blog: { chars: number };
  email: { chars: number };
  x: { parts: number; chars: number };
  linkedin: { chars: number; truncated: boolean };
};

export function transform(markdown: string): TransformResult {
  void markdown;
  return {
    blog: "",
    email: "",
    x: [],
    linkedin: "",
    meta: {
      blog: { chars: 0 },
      email: { chars: 0 },
      x: { parts: 0, chars: 0 },
      linkedin: { chars: 0, truncated: false },
    },
  };
}
