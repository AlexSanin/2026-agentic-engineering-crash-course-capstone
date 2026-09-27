import { type HastNode, textOf } from "./ast";

/**
 * Escape what Jira reads as markup: `{ } [ ] * _ | !` anywhere, and `#` or `-` at the start of a
 * line. The start of a text node counts as the start of a line, so a `-` right after bold text is
 * escaped too. Jira shows `\-` as `-`, so that costs nothing.
 *
 * ponytail: `^ ~ + - ??` stay unescaped inside a line, so a text such as `a+b+c` can render with
 * an underline in Jira. A literal backslash stays as it is, and Jira reads `\\` as a line break.
 * Add a mark to the set when a user reports a ticket that renders wrong.
 */
const escape = (text: string): string =>
  text.replace(/[{}[\]*_|!]/g, "\\$&").replace(/(^|\n)([#-])/g, "$1\\$2");

/**
 * A code block in the code macro. Code is never escaped, because Jira reads no markup inside it.
 *
 * ponytail: the language name passes through as markdown writes it. Jira knows a fixed list of
 * languages, and it can show a warning for another name, such as `ts`. Map the short names when a
 * user reports that warning.
 */
const code = (pre: HastNode): string => {
  const lang = String(pre.children?.[0]?.properties?.className ?? "").match(/language-([^\s,]+)/)?.[1];
  return [lang ? `{code:${lang}}` : "{code}", textOf(pre).replace(/\n$/, ""), "{code}"].join("\n");
};

function inline(node: HastNode): string {
  if (node.type === "text") return escape(node.value ?? "");
  const inner = (node.children ?? []).map(inline).join("");
  switch (node.tagName) {
    case "strong":
      return `*${inner}*`;
    case "em":
      return `_${inner}_`;
    case "code":
      return `{{${textOf(node)}}}`;
    case "a":
      return `[${inner}|${String(node.properties?.href ?? "")}]`;
    case "pre":
      // A code block inside a list item.
      return `\n${code(node)}\n`;
    default:
      return inner;
  }
}

const isList = (node: HastNode): boolean => node.tagName === "ul" || node.tagName === "ol";

/** One line for each item. A nested list adds its own mark to the marks of its parent: `*#`. */
function list(node: HastNode, prefix: string): string {
  const mark = prefix + (node.tagName === "ol" ? "#" : "*");
  return (node.children ?? [])
    .filter((li) => li.tagName === "li")
    .map((li) => {
      const kids = li.children ?? [];
      const text = kids.filter((kid) => !isList(kid)).map(inline).join("").trim();
      return [`${mark} ${text}`, ...kids.filter(isList).map((kid) => list(kid, mark))].join("\n");
    })
    .join("\n");
}

function block(node: HastNode): string {
  const tag = node.tagName ?? "";
  if (/^h[1-6]$/.test(tag)) return `${tag}. ${inline(node)}`;
  if (tag === "pre") return code(node);
  if (tag === "blockquote") return `{quote}\n${blocks(node)}\n{quote}`;
  if (isList(node)) return list(node, "");
  if (tag === "hr") return "----";
  return inline(node);
}

/** The block children of `node`, one blank line apart. The newline text between them is dropped. */
const blocks = (node: HastNode): string =>
  (node.children ?? [])
    .filter((child) => child.type === "element")
    .map(block)
    .filter(Boolean)
    .join("\n\n");

/** The Jira output: wiki markup, from the same tree as the other outputs. */
export const jira = (tree: HastNode): string => blocks(tree);
