/**
 * Jira wiki markup to markdown. A line parser for the constructs that `lib/transform/jira.ts`
 * writes, plus `{noformat}` and `bq.`, which people who write Jira by hand use. The round trip in
 * `jira.test.ts` is the contract. Anything else passes through as text.
 *
 * ponytail: tables, panels, colours, mentions and `\\` line breaks pass through as text. A text
 * line that markdown reads as block syntax, such as `1. step`, stays as it is too. Add a rule when
 * a user pastes a ticket that converts wrong.
 */

const CODE = /^\{code(?::([\w+#-]+)(?=[|}]))?[^}]*\}$/;
const HEADING = /^h([1-6])\. (.*)$/;
const LIST = /^([*#]+) (.*)$/;
const KEPT = /(\d+)/g;

/**
 * The inline rules. Code spans and backslash escapes come out first, so that no rule touches them.
 * An escape stays as it is, because markdown reads a backslash before punctuation the same way.
 */
function inline(text: string): string {
  const kept: string[] = [];
  const keep = (value: string): string => `${kept.push(value) - 1}`;
  return text
    .replace(/\{\{(.+?)\}\}/g, (_, code: string) => keep(`\`${code}\``))
    .replace(/\\[^\sA-Za-z0-9]/g, keep)
    .replace(/\[([^|\]]*)\|([^\]]+)\]/g, "[$1]($2)")
    .replace(/\*([^*\s](?:[^*]*[^*\s])?)\*/g, "**$1**")
    .replace(KEPT, (_, index: string) => kept[Number(index)]);
}

/** A list line. Each parent mark indents by the width of its markdown marker: `- ` or `1. `. */
const item = (marks: string, text: string): string =>
  [...marks.slice(0, -1)].map((mark) => (mark === "#" ? "   " : "  ")).join("") +
  `${marks.endsWith("#") ? "1." : "-"} ${inline(text)}`;

export function jiraToMarkdown(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];

  /** The lines between `start` and the line `end`, and the index of `end`. An open block runs to the end. */
  const until = (start: number, end: string): [string[], number] => {
    const close = lines.findIndex((line, index) => index > start && line.trim() === end);
    const stop = close === -1 ? lines.length : close;
    return [lines.slice(start + 1, stop), stop];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const code = line.trim().match(CODE);
    if (code || line.trim() === "{noformat}") {
      const [body, stop] = until(i, code ? "{code}" : "{noformat}");
      out.push(`\`\`\`${code?.[1] ?? ""}`, ...body, "```");
      i = stop;
      continue;
    }
    if (line.trim() === "{quote}") {
      const [body, stop] = until(i, "{quote}");
      out.push(...jiraToMarkdown(body.join("\n")).split("\n").map((quoted) => (quoted ? `> ${quoted}` : ">")));
      i = stop;
      continue;
    }

    const heading = line.match(HEADING);
    const list = line.match(LIST);
    if (heading) out.push(`${"#".repeat(Number(heading[1]))} ${inline(heading[2])}`);
    else if (list) out.push(item(list[1], list[2]));
    else if (line.startsWith("bq. ")) out.push(`> ${inline(line.slice(4))}`);
    // `***`, not `---`: under a text line, `---` would turn that line into a heading.
    else if (/^-{4}\s*$/.test(line)) out.push("***");
    else out.push(inline(line));
  }

  return out.join("\n");
}
