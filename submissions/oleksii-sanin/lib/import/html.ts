/**
 * HTML to markdown: the reverse of the pipeline that the transform uses, with one tree pass for
 * Google Docs in the middle. `app/tool.tsx` loads this module on demand, so the first page load
 * carries none of it.
 *
 * ponytail: Word puts a list on the clipboard as paragraphs that start with a bullet character, so
 * a rich-text paste from Word gives paragraphs, not a markdown list. A `.docx` file keeps the list,
 * because `mammoth` reads the list structure. Map the Word list paragraphs (`mso-list` in the style)
 * if users paste lists from Word.
 */

import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import type { HastNode } from "@/lib/transform/ast";

const wrap = (tagName: string, child: HastNode): HastNode => ({ type: "element", tagName, properties: {}, children: [child] });

/**
 * The Google Docs pass, and the image rule.
 *
 * - Google Docs puts the whole clipboard in `<b id="docs-internal-guid-…">` with a normal weight.
 *   Without the unwrap, the whole paste becomes bold.
 * - Google Docs marks emphasis with a style on a `<span>`, not with `<b>` and `<i>`.
 * - An image with a `data:` URL can hold more than the 100 KB that the transform accepts.
 */
function clean(node: HastNode): HastNode[] {
  if (node.tagName === "img" && /^(data:|$)/.test(String(node.properties?.src ?? "").trim())) return [];
  if (node.children) node.children = node.children.flatMap(clean);
  if (node.tagName === "b" && String(node.properties?.id ?? "").startsWith("docs-internal-guid")) {
    return node.children ?? [];
  }
  if (node.tagName === "span") {
    const style = String(node.properties?.style ?? "");
    const italic = /font-style:\s*italic/.test(style) ? wrap("em", node) : node;
    return [/font-weight:\s*(bold|[6-9]00)/.test(style) ? wrap("strong", italic) : italic];
  }
  return [node];
}

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(() => (tree) => void clean(tree as unknown as HastNode))
  .use(rehypeRemark)
  .use(remarkStringify, { bullet: "-", emphasis: "_", rule: "-" });

export const htmlToMarkdown = (html: string): string => String(processor.processSync(html));
