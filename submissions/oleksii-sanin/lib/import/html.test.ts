import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "./html";

describe("HTML converts to markdown", () => {
  it("keeps a heading and a link", () => {
    const markdown = htmlToMarkdown('<h2>Setup</h2><p>See <a href="https://example.com">docs</a>.</p>');

    expect(markdown.split("\n")).toContain("## Setup");
    expect(markdown).toContain("[docs](https://example.com)");
  });

  it("keeps the language of a code block", () => {
    const markdown = htmlToMarkdown('<pre><code class="language-ts">const a = 1</code></pre>');

    expect(markdown).toContain("```ts\nconst a = 1\n```");
  });

  it("drops a script and a style", () => {
    const markdown = htmlToMarkdown("<style>p { color: red }</style><script>alert(1)</script><p>Hi</p>");

    expect(markdown).toContain("Hi");
    expect(markdown).not.toContain("alert");
    expect(markdown).not.toContain("color");
  });

  it("drops an inline image and an image with no source, and keeps a linked image", () => {
    const markdown = htmlToMarkdown(
      '<p><img src="data:image/png;base64,AAAA" alt="a"><img src="" alt="c"><img src="https://example.com/b.png" alt="b"></p>',
    );

    expect(markdown).toContain("![b](https://example.com/b.png)");
    expect(markdown).not.toContain("data:");
    expect(markdown.match(/!\[/g)).toHaveLength(1);
  });

  // The human chose a hand-made fixture on 2026-09-27. It copies the Google Docs clipboard shape:
  // the `docs-internal-guid` wrapper with a normal weight, and a style on each span. It is NOT a
  // captured clipboard, so the paste in task 9.1 is the only proof against real Google Docs.
  it("keeps only the real bold of Google Docs HTML", () => {
    const html = readFileSync(new URL("./fixtures/gdocs.html", import.meta.url), "utf8");

    expect(htmlToMarkdown(html).trim().split("\n")).toEqual(["# Release notes", "", "Run the **check** before you push."]);
  });
});
