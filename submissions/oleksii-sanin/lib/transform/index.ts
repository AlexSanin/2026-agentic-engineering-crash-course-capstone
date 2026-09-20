/**
 * One markdown source, four channel outputs.
 *
 * This module is pure. It imports no React and no Next, so `app/api/transform/route.ts`
 * stays thin and every rule below is testable without a browser and without a server.
 */

import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { type HastNode, toBlocks } from "./ast";
import { linkedin } from "./linkedin";
import { thread } from "./x";

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

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/**
 * Inline styles for the email output. Gmail strips a `<style>` block and an external
 * stylesheet, so every rule has to sit on the element itself.
 */
const EMAIL_STYLES: Record<string, string> = {
  h1: `font-family: ${SANS}; font-size: 28px; line-height: 1.3; margin: 0 0 16px; color: #111111;`,
  h2: `font-family: ${SANS}; font-size: 22px; line-height: 1.3; margin: 24px 0 12px; color: #111111;`,
  h3: `font-family: ${SANS}; font-size: 18px; line-height: 1.3; margin: 20px 0 10px; color: #111111;`,
  p: `font-family: ${SANS}; font-size: 16px; line-height: 1.6; margin: 0 0 16px; color: #222222;`,
  a: "color: #0b57d0; text-decoration: underline;",
  ul: `font-family: ${SANS}; font-size: 16px; line-height: 1.6; margin: 0 0 16px; padding-left: 24px; color: #222222;`,
  ol: `font-family: ${SANS}; font-size: 16px; line-height: 1.6; margin: 0 0 16px; padding-left: 24px; color: #222222;`,
  li: "margin: 0 0 8px;",
  blockquote:
    `font-family: ${SANS}; font-size: 16px; line-height: 1.6; margin: 0 0 16px; padding: 8px 16px; border-left: 4px solid #dddddd; color: #555555;`,
  pre: `font-family: ${MONO}; font-size: 14px; line-height: 1.5; margin: 0 0 16px; padding: 12px; background: #f6f8fa; border-radius: 6px; overflow-x: auto;`,
  code: `font-family: ${MONO}; font-size: 14px;`,
  hr: "border: 0; border-top: 1px solid #dddddd; margin: 24px 0;",
  img: "max-width: 100%; height: auto;",
  table: `font-family: ${SANS}; font-size: 16px; border-collapse: collapse; margin: 0 0 16px;`,
  th: "border: 1px solid #dddddd; padding: 8px; text-align: left;",
  td: "border: 1px solid #dddddd; padding: 8px;",
};

const toHast = unified().use(remarkParse).use(remarkRehype);
const toHtml = unified().use(rehypeStringify);

/** Walk the tree and put the style map on every element it names. */
function applyEmailStyles(node: HastNode): HastNode {
  if (node.type === "element" && node.tagName) {
    const style = EMAIL_STYLES[node.tagName];
    if (style) node.properties = { ...node.properties, style };
  }
  node.children?.forEach(applyEmailStyles);
  return node;
}

const EMPTY: TransformResult = {
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

export function transform(markdown: string): TransformResult {
  if (markdown.trim() === "") return structuredClone(EMPTY);

  const tree = toHast.runSync(toHast.parse(markdown)) as unknown as HastNode;

  const blog = toHtml.stringify(tree as never);
  const email = toHtml.stringify(applyEmailStyles(structuredClone(tree)) as never);

  const blocks = toBlocks(tree);
  const x = thread(blocks);
  const post = linkedin(blocks);

  return {
    blog,
    email,
    x,
    linkedin: post.text,
    meta: {
      blog: { chars: blog.length },
      email: { chars: email.length },
      x: { parts: x.length, chars: x.join("").length },
      linkedin: { chars: post.text.length, truncated: post.truncated },
    },
  };
}
