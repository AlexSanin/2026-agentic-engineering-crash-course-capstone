import { type Block, sentences } from "./ast";

/** LinkedIn stops showing a post beyond this length. */
const LIMIT = 3000;

/**
 * The LinkedIn output: plain text, no emphasis marks, each URL on its own line.
 *
 * `toBlocks` already did the first two: the walk reads text nodes, so a mark never survives,
 * and it puts every href on a line of its own. This function adds the cut.
 */
export function linkedin(blocks: Block[]): { text: string; truncated: boolean } {
  const full = blocks.map((block) => block.text).join("\n\n");
  if (full.length <= LIMIT) return { text: full, truncated: false };

  let out = "";
  for (const sentence of sentences(full)) {
    if (out.length + sentence.length > LIMIT) break;
    out += sentence;
  }

  // A first sentence longer than the whole limit leaves nothing to keep. The hard cut is the
  // only answer left, and it is better than an empty post.
  return { text: out.trimEnd() || full.slice(0, LIMIT), truncated: true };
}
