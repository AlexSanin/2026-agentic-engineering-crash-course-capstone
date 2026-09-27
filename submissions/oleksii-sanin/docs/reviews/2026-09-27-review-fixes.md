# Review — the task 9.4 fixes of add-jira-gdocs-and-import

- **Date:** 2026-09-27
- **Reviewed:** `git diff 5f7af78..08ecb9d` — commits `fc1da50` to `08ecb9d`, the fixes for
  `docs/reviews/2026-09-27-add-jira-gdocs-and-import.md`
- **Reviewer:** the `reviewer` subagent, `.claude/agents/reviewer.md`, started by the session that
  wrote the fixes. It had no part in the code.
- **Maker:** the session that fixed the findings of the first review.
- **Result:** 8 correctness findings, and the reviewer marks 3 of them (2, 3 and 4) as regressions
  that the fixes introduced. Missing tests in 2 files, 2 rule violations, 4 spec drift findings.
- **Status:** NOT FIXED. The human chose to fix these findings in a separate session.

The text below is the reviewer's own, unchanged.

---

Review of `git diff 5f7af78..08ecb9d` (7 commits, 19 files, +594/-80). I found 4 new correctness problems. Two are regressions the fixes introduced: the quadratic regexes in findings 2 and 3 below. The worst problem is not new, but the finding 4 fix does not close it: an HTML `<base>` element still lets a `javascript:` link through to the blog, email and gdocs outputs.

`pnpm check` exited 0: "Test Files 14 passed (14) / Tests 135 passed (135)", with typecheck and lint clean. `openspec validate add-jira-gdocs-and-import --strict` printed "Change 'add-jira-gdocs-and-import' is valid" and exited 0. Every pair below comes from running the real modules through jiti probes in the scratchpad (with `fsCache: false`). Where I say "before", the probe ran the same input on a copy of `lib/` taken from 5f7af78. I have deleted the probes. No `node_modules/.cache` was created.

All paths are under /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin.

## 1. Correctness (most severe first)

1. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/html.ts:64 — `safe()` checks each raw `href`, but `rehype-remark` later resolves every URL against a `<base>` element (hast-util-to-mdast `state.resolve` → `new URL(url, base)`). So the finding 4 fix and the spec rule "MUST be dropped" can be bypassed.
   - Input: `<base href="javascript://%0aalert(1)/"><a href="x">click</a>`
   - Actual: `[click](javascript://%0aalert\(1\)/x)`. The blog output of that markdown is `<p><a href="javascript://%0aalert(1)/x">click</a></p>`. That link runs `alert(1)` when clicked.
   - Expected: `click`, with no link.
   - Same path: `<base href="javascript:alert(1)"><a href="x">click</a>` throws "Invalid URL", and the page shows "The page could not convert the rich text."
   - Both were the same before the fix, so this is a gap, not a regression.
   - Fix: add `base` to the dropped tags on line 64, or run `safe()` on the resolved mdast URL.

2. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/html.ts:43 — REGRESSION from cfa5bb1. `/\s*$/` in `edges()` is quadratic when a mark's last text node holds a long whitespace run with a non-space before it.
   - Input: `<p><b>y` + 100,000 spaces + `x</b></p>`. It takes 4.6 s. At 20k, 40k, 80k and 160k spaces it takes 189 ms, 730 ms, 2.9 s and 11.6 s.
   - Before cfa5bb1: 2 ms or less at every size.
   - This is the same class as finding 19, and it is within the 1 MB file limit.
   - Fix: `const trail = v.slice(v.trimEnd().length)`. `trimEnd` strips the same set as `\s` and runs in linear time.

3. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.ts:27 — REGRESSION from 66d14b5. The padding regex `^ .*\S.* $` is quadratic on a code span that starts with a space.
   - Input: `{{ ` + 100,000 × `a` + `}}`. It takes 3.8 s (40k takes 619 ms).
   - Before 66d14b5: 0 ms.
   - The finding 19 test ("reads a long line … in linear time") only uses `[`, `{` and `[a|b `, so it misses this.
   - Fix: `code.startsWith(" ") && code.endsWith(" ") && code.trim() !== ""`.

4. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.ts:61-62 — REGRESSION from 66d14b5. `keep(url)` and `keep(src)` store a string that already holds a placeholder from `spans()` or the escape rule. The one-pass restore on line 65 then leaves the inner placeholder in the output. This breaks the finding 20 goal.
   - `[a|https://x.com/a\_b]`: actual `[a](https://x.com/a0b)`, and the blog href is `https://x.com/a%EE%80%800%EE%80%81b`. Before: `[a](https://x.com/a\_b)`.
   - `[share|\\server\share]`: actual `[share](0server\share)`. Before: `[share](\\server\share)`.
   - `[a|https://x.com/{{id}}]`: actual href `https://x.com/%EE%80%800%EE%80%81`.
   - `!foo[a|https://x.com]bar!`: actual `![](foo[a](0)bar)`.
   - Only hand-written Jira reaches this path, because the transform percent-encodes `\` and `{` in a URL.
   - Fix: restore the kept pieces inside `url` and `src` before `keep()`, or restore in a loop until no placeholder remains.

5. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/transform/jira.ts:65 and /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.ts:103-106 — finding 11 is marked "fixed on both sides", but a list item that starts with a code block still breaks.
   - Markdown `- ```js\n  x\n  ```\n- b\n` gives the Jira output `* {code:js}\nx\n{code}\n* b`.
   - The import turns that into `- {code:js}\nx\n```\n* b\n```\`. The item holds the text "{code:js} x", and `* b` ends up inside a code block.
   - Expected: the blog HTML equals the source's blog HTML. It was the same before the fix.
   - Fix: put the code on its own line after the bullet in the transform, and add a round-trip case to the fixture.

6. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.ts:92 — a loose list item with text after its code loses that text from the list.
   - Markdown `- a\n\n  ```js\n  x\n  ```\n\n  more\n- b\n` gives the Jira output `* a\n{code:js}\nx\n{code}\nmore\n* b`.
   - The blog output after the round trip is `<ul><li>a<pre>…</pre></li></ul><p>more</p><ul><li>b</li></ul>`.
   - Expected: `more` inside the first item. The output was broken before the fix too, in a different way.
   - Related and unchanged by the fix: `- a\n\n  > q\n- b` still writes a blank line, `* a\n\nq\n* b`, which ends the Jira list. This is the same cause as finding 11.

7. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/html.ts:38-47 — the finding 15 fix covers one mark only. Nested marks next to a letter still print character references.
   - `<p>x<b><i>y</i></b>z</p>` gives `&#x78;**_y_**&#x7A;`.
   - The Google Docs bold-italic shape `<p><span style="font-weight:700;font-style:italic">bi</span><span>x</span></p>` gives `**_bi_**&#x78;`.
   - `<p><b><a href="https://x.com">link </a></b>after</p>` gives `**[link ](https://x.com)**&#x61;fter`.
   - Expected: readable text. The output was the same before the fix, so this is not a regression.

8. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/transform/jira.ts:46 — the new `img` case writes `src` unescaped, so a `!` in the URL closes the image early.
   - `![](https://x.com/wow!.png)` gives the Jira output `!https://x.com/wow!.png!`.
   - The import gives `![](https://x.com/wow).png!`.
   - Expected: the same `src` after the round trip. This is rare, and a `|` in the URL is safe because remark encodes it to `%7C`.
   - Fix: percent-encode `!` in `src`.

## 2. Missing tests

- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.test.ts — no input reaches the `pad` branch of `span()` (jira.ts:27): the fixture and the tests hold no code span with a backtick at an end or a space at both ends.
  - Add `{{`}}` → `` `` ` `` `` and `{{ a }}` → `` `  a  ` ``.
  - Add a 100k `{{ a…}}` timing case.
  - Add a link URL that holds `\_` or `{{…}}`, for finding 4.
- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/html.test.ts — add three cases: `<base>` (finding 1), nested marks (finding 7), and a long-whitespace timing case for `edges()` (finding 2).

## 3. Rule violations

- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/app/tool.tsx:70-95 — AGENTS.md: "New behaviour has a test beside the code (`*.test.ts` / `*.test.tsx`)."
  - The stale guard (`latest`, `edit`, `load`) and the `converted` state (findings 6, 17 and 18) have no test beside them.
  - The only check is the browser script, which is outside `pnpm check`.
  - The previous rule violation is fixed for Open file and Paste rich text only.
  - Also, `vitest.config.mts` includes no `*.test.tsx`, so a component test would not run anyway.
  - Fix: move the sequencing into `lib/` with a test, or amend the rule.
- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/openspec/changes/add-jira-gdocs-and-import/tasks.md:35 — AGENTS.md: "Tick each task in `tasks.md` in the same commit as the work it tracks." Task 5.5 ("Commit the HTML conversion") is ticked in 67e0461 (the fixture commit), but the conversion is in 5ec12e1.

## 4. Spec drift

- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/openspec/changes/add-jira-gdocs-and-import/design.md:67-69 and :112-114 — design.md still says `app/tool.tsx` loads `html.ts` and `docx.ts` in its handlers, and "The new controls stay in `app/tool.tsx`".
  - Since a7bfb99, that logic and those loads live in `lib/import/file.ts` (`importFile`) and `lib/clipboard.ts` (`paste`). The comment at html.ts:2-4 says the same stale thing.
  - Task 9.6 was ticked in fc1da50, before a7bfb99.
  - Fix: edit design.md in its own commit.
- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/openspec/changes/add-jira-gdocs-and-import/specs/markdown-import/spec.md:32 — "Audio, video, frames and form fields MUST be dropped", but other form fields keep their text.
  - `<select><option>a</option></select>` → `a`. `<textarea>t</textarea>` → `t`. `<button>` keeps its text.
  - Fix: add them to html.ts:64, or narrow the spec to `input`.
- Same file, :30-31 — "A link … with a URL that is not http:, https:, mailto: or relative MUST be dropped". The `<base>` bypass in correctness finding 1 breaks this rule.
- Same file, :102 — "Text that markdown reads as markup, such as `<` and a backtick, MUST stay text", but some Jira text becomes markdown blocks.
  - `jiraToMarkdown("1. step")` gives the blog output `<ol><li>step</li></ol>`, and `> not a quote` gives `<blockquote>`.
  - The ponytail at jira.ts:6-8 names this ceiling, but the spec does not.
  - Fix: name the ceiling in the spec, or limit the MUST to inline markup.
- Same file, :105 and :132 — two new MUSTs have no scenario: "MUST NOT convert the same text twice", and "An import result that arrives after a later import or an edit MUST NOT replace the textarea". The acceptance contract therefore has no check for them.
- Each new scenario does have a test:
  - script link, table and strike: html.test.ts
  - noformat and `bq.`, angle brackets: import/jira.test.ts
  - image-only paste: clipboard.test.ts and file.test.ts, at the lib level
  - heading escape, bang image, nested quote: transform/jira.test.ts

## Areas where I found nothing

- I re-ran the reviewer's exact inputs for findings 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16 and 20. Each now gives the expected output, except for the gaps above.
- Quote flattening (three levels, code in a quote, a list in a quote) and the `hN. `/`bq. ` escape: no regression. I tried `h2.x`, `H2.`, `h7.`, `bq.` with no space, soft-break lines, list items, and a text node after bold.
- Real-world HTML: no regression. I tried the Google Docs guid wrapper with a link and a list, a Word MsoNormal paste with `<o:p>` and `name` anchors, mammoth bookmarks and footnotes, and a table with a `colgroup`.
- The URL check handles these correctly: protocol-relative, a space in the URL, `HTTPS:` in capitals, `?q=a:b`, `./a:b`, an entity-encoded `javascript:`, and a leading NBSP (the transform turns it into `%C2%A0`, which is a relative link).
- `tel:`, `ftp:` and `C:` links now lose the link and keep the text. The spec asks for that.
- Jira import speed: 15 other adversarial 100k-character lines each took 9 ms or less.
- tool.tsx, by reading only: I found no path where a current import is dropped or a stale one lands. `load()` never receives a rejecting promise.

## What I could not review

- **Jira rendering:** I had no Jira instance, so I could not check:
  - whether `h2\.` and `bq\.` show without the backslash (the code comment admits this is unchecked);
  - how Jira reads the transform's `{{{name}}}` (a lazy parser would give the code `{name` followed by `}`);
  - `* {code}` on a bullet line.
- **The page:** I did not run `docs/runs/2026-09-27-browser-run.mjs` and did not start a browser. The stale guard and the `converted` state are checked by reading only. I did not reproduce the mutant-run claim in `docs/runs/2026-09-27-browser-run-fixes.txt`.
- **mammoth in the browser (`{ arrayBuffer }`) and a real Google Docs clipboard:** not run. The fixture is hand-made.
- **Working tree:** `git status` now shows `docs/reviews/2026-09-27-add-jira-gdocs-and-import.md` modified as well as `.agent-log/actions.jsonl`. Another session appended an "Outcome of each finding" table while I was reviewing. I did not write that file and did not review the new text, apart from noting that it calls findings 4, 11, 15 and 20 "Fixed", which correctness findings 1, 4, 5 and 7 above contradict.
