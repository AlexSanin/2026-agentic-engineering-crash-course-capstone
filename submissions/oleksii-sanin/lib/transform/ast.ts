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
  /** The plain text. For a code block, the code without its fences. */
  text: string;
};

/** Wrap code in the fences that the plain-text outputs print. */
export const fence = (code: string): string => `\`\`\`\n${code}\n\`\`\``;

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

/** The text of `node` less every nested `pre`, which becomes a code block of its own. */
const proseOf = (node: HastNode): string =>
  node.tagName === "pre"
    ? ""
    : node.type === "text"
      ? (node.value ?? "")
      : (node.children ?? []).map(proseOf).join("");

const presOf = (node: HastNode): HastNode[] =>
  node.tagName === "pre" ? [node] : (node.children ?? []).flatMap(presOf);

const hrefsOf = (node: HastNode): string[] => {
  const here = node.tagName === "a" && typeof node.properties?.href === "string"
    ? [node.properties.href as string]
    : [];
  return [...here, ...(node.children ?? []).flatMap(hrefsOf)];
};

const listText = (node: HastNode): string =>
  (node.children ?? [])
    .filter((child) => child.tagName === "li")
    .map((li) => `• ${proseOf(li).trim()}`)
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

    const base = node.tagName === "ul" || node.tagName === "ol" ? listText(node) : proseOf(node).trim();
    // A bare link is already a line of its own.
    const urls = hrefsOf(node).filter((url) => !base.split("\n").includes(url));
    const text = [base, ...urls].filter(Boolean).join("\n");
    if (text.trim()) blocks.push({ kind: "text", text });

    // ponytail: a code block inside a list or a quote follows all the text of that container,
    // so text below the code moves above it. Split the container at each `pre` if order matters.
    for (const pre of presOf(node)) {
      const code = textOf(pre).replace(/\n+$/, "");
      if (code.trim()) blocks.push({ kind: "code", text: code });
    }
  }

  return blocks;
}
