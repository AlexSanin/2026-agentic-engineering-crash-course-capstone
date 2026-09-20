/**
 * The hast tree, reduced to what the four outputs read.
 *
 * `@types/hast` is a transitive dependency, and pnpm hides it from an import here. A full
 * type costs one more dependency and one more human decision, so this module declares the
 * fields that the walks actually touch.
 */

export type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

/** One top-level block of the document, as plain text. */
export type Block = {
  /** A code block never merges with prose, and it never splits at a sentence. */
  kind: "code" | "text";
  text: string;
};

const GRAPHEMES = new Intl.Segmenter("en", { granularity: "grapheme" });
const SENTENCES = new Intl.Segmenter("en", { granularity: "sentence" });
const WORDS = new Intl.Segmenter("en", { granularity: "word" });

/** The grapheme count of `text`. X counts differently, and `x.ts` names that ceiling. */
export const graphemes = (text: string): number => [...GRAPHEMES.segment(text)].length;

export const sentences = (text: string): string[] =>
  [...SENTENCES.segment(text)].map((s) => s.segment);

export const words = (text: string): string[] => [...WORDS.segment(text)].map((s) => s.segment);

/** Cut `text` into pieces of at most `budget` graphemes. The last resort, inside one word. */
export const splitGraphemes = (text: string, budget: number): string[] => {
  const all = [...GRAPHEMES.segment(text)].map((g) => g.segment);
  const out: string[] = [];
  for (let i = 0; i < all.length; i += budget) out.push(all.slice(i, i + budget).join(""));
  return out;
};

const textOf = (node: HastNode): string =>
  node.type === "text" ? (node.value ?? "") : (node.children ?? []).map(textOf).join("");

const hrefsOf = (node: HastNode): string[] => {
  const here = node.tagName === "a" && typeof node.properties?.href === "string"
    ? [node.properties.href as string]
    : [];
  return [...here, ...(node.children ?? []).flatMap(hrefsOf)];
};

const listText = (node: HastNode): string =>
  (node.children ?? [])
    .filter((child) => child.tagName === "li")
    .map((li) => `• ${textOf(li).trim()}`)
    .join("\n");

/**
 * Turn the document into top-level blocks of plain text.
 *
 * Every URL moves to its own line under the block that holds it. LinkedIn breaks an inline
 * link, and the plain text of a link element would otherwise drop the target altogether.
 */
export function toBlocks(tree: HastNode): Block[] {
  const blocks: Block[] = [];

  for (const node of tree.children ?? []) {
    if (node.type !== "element" || !node.tagName) continue;

    if (node.tagName === "pre") {
      const code = textOf(node).replace(/\n+$/, "");
      if (code.trim()) blocks.push({ kind: "code", text: `\`\`\`\n${code}\n\`\`\`` });
      continue;
    }

    const base = node.tagName === "ul" || node.tagName === "ol" ? listText(node) : textOf(node).trim();
    const urls = hrefsOf(node);
    const text = [base, ...urls].filter(Boolean).join("\n");
    if (text.trim()) blocks.push({ kind: "text", text });
  }

  return blocks;
}
