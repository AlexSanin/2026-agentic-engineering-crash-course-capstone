import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transform } from "@/lib/transform";
import { jiraToMarkdown } from "./jira";

const FIXTURE = readFileSync(new URL("./fixtures/round-trip.md", import.meta.url), "utf8");

describe("Jira wiki markup converts to markdown", () => {
  it("keeps the blog HTML of a markdown source through a round trip", () => {
    const { jira, blog } = transform(FIXTURE);

    // The fixture must reach every construct that the Jira output writes.
    for (const mark of ["h1. ", "h3. ", "*bold*", "_italic_", "{{pnpm check}}", "[link|", "{code:ts}", "{code}",
      "\n*# ", "\n** ", "\n# ", "\n#* ", "\\*not bold\\*", "\\[not\\|a link\\]", "{quote}", "----", "\\{", "\\*", "\\_", "\\|", "\\!", "\n\\#", "\n\\-"]) {
      expect(jira, mark).toContain(mark);
    }
    expect(transform(jiraToMarkdown(jira)).blog).toBe(blog);
  });

  it("passes an unsupported macro through as text", () => {
    expect(jiraToMarkdown("{panel}Note{panel}")).toContain("Note");
  });

  it("turns a heading into its markdown form", () => {
    expect(jiraToMarkdown("h2. Setup")).toBe("## Setup");
  });

  // design.md: people who write Jira by hand use both.
  it("reads a noformat block and a bq. line", () => {
    expect(jiraToMarkdown("bq. Quoted\n\n{noformat}\na *b*\n{noformat}")).toBe("> Quoted\n\n```\na *b*\n```");
  });

  // Markdown reads `----` under a text line as a heading underline.
  it("keeps a rule under a text line a rule", () => {
    const { blog } = transform(jiraToMarkdown("Text\n----"));

    expect(blog).toBe("<p>Text</p>\n<hr>");
  });

  it("closes a code block that Jira leaves open", () => {
    expect(jiraToMarkdown("{code:js}\nlet a")).toBe("```js\nlet a\n```");
  });
});
