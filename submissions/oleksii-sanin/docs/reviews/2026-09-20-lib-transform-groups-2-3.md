# Review — `lib/transform`, task groups 2 and 3

- **Date:** 2026-09-20
- **Reviewed:** `git diff 8c4804a..bc9c904 -- lib/` — 9 files, 612 lines
- **Reviewer:** the `reviewer` subagent, `.claude/agents/reviewer.md`, session `review-groups-2-3`
- **Maker:** a different session. The session that wrote this code did not review it.
- **Result:** 6 correctness bugs, 6 coverage gaps, 4 weak tests, 4 low-severity spec drifts, no rule
  violation.

Two notes on the scope, for the reader:

1. The range ends at `bc9c904`. Later commits are not in the reviewer's view. Finding 2.6 asks for a
   URL test, and `2a64a11` and the commit after it already added one, plus two bound assertions.
   The reviewer saw 22 tests. The suite holds 29 at the time of writing.
2. This reviewer first went idle for about 35 minutes and reported nothing. The report below arrived
   after a direct request. `docs/autonomy-log.md` records that failure.

## What I reproduced, before any fix — 2026-09-20

I ran each named input against the code at `174c6c5`, rather than trust the report. Four of five
reproduced exactly. One did not.

| Finding | Severity | Reproduced | What I observed |
|---|---|---|---|
| 1.1 LinkedIn hard cut breaks a surrogate pair | HIGH | **no, not as stated** | The named input gives 3000 units and no lone surrogate. The sentence loop handled it, so the hard-cut branch never ran. The branch at `linkedin.ts:24` is still untested, and still cuts code units. A first sentence longer than 3000 characters is needed to reach it. Re-test before fixing. |
| 1.2 `splitWords` wastes the part it just started | HIGH | yes | 3 parts. Part 1 is `"See https://example.com/\n\n1/3"`, 29 graphemes against a budget of 275. |
| 1.3 `splitLines` emits a fence-only part | HIGH | yes | 4 parts. Part 1 and part 4 hold 8 graphemes each, and nothing but a fence marker and the counter. |
| 1.5 A fence inside a list item is not a code block | MEDIUM | yes | One part: `"• item one\nconst a = 1;\nconst b = 2;\n\n1/1"`. The fence is gone and the code merged into the prose. |
| 1.6 A link whose text equals its target repeats the URL | LOW | yes | `linkedin` is `"https://example.com/a\nhttps://example.com/a"`. |

Not yet reproduced, and still open: 1.4, 1.7, and every item in sections 2, 3 and 4. Section 3.1 is
the most serious of them: two mutant implementations passed the whole suite.

**Status: nothing on this list is fixed.** Task 6.5 of `tasks.md` stays open. The next session picks
it up from this table.

---

The text below is the reviewer's own, unchanged.

---

Review of `git diff 8c4804a..bc9c904 -- lib/` — 6 correctness bugs, and 2 mutant implementations that pass all 22 tests.

Reviewed: 9 files, 612 lines of diff, under `lib/transform/`: `index.ts`, `ast.ts`, `x.ts`, `linkedin.ts`, and the five test files. I read `specs/markdown-transform/spec.md`, `design.md` and `AGENTS.md` first. I ran the suite (22 tests, green), I ran the code against about 40 crafted inputs, and I mutated the implementation to measure the tests. I did not review `app/api/transform/route.ts` or commit 4eebf54. Both sit outside the range.

---

# 1. Correctness

### 1.1 The LinkedIn hard cut breaks a surrogate pair — HIGH

`lib/transform/linkedin.ts:24`

`full.slice(0, LIMIT)` cuts UTF-16 code units, not graphemes.

Input: `transform("x".repeat(2999) + " 👨‍👩‍👧‍👦 more text here.")`
Output: a 3000-unit string whose last unit is the lone high surrogate `\uD83D`. The text is not valid UTF-16. A reader sees `�`.

Fix: `ast.ts:37` already exports the helper. Use `splitGraphemes(full, LIMIT)[0]`.

### 1.2 `splitWords` throws away the part it just started — HIGH

`lib/transform/x.ts:31-38`

When one word is longer than the budget, the code pushes `current` as a finished part, then starts the grapheme split from zero. The flushed part keeps whatever few graphemes it held.

Input: `transform("See https://example.com/" + "a".repeat(400) + " now.")`
Output: 3 parts. Part 1 is `"See https://example.com/\n\n1/3"`. That part holds 29 graphemes, and the budget is 275. The thread wastes 246 graphemes and one whole part.

Fix: one line. Replace `splitGraphemes(word, budget)` with `splitGraphemes(current + word, budget)`, and drop the `out.push(current.trim())` above it.

### 1.3 `splitLines` emits a part that holds only a fence marker — HIGH

`lib/transform/x.ts:56-58`

The same shape as 1.2, in the code path.

Input: a fence that holds one 417-character line, such as ` ```js ` then `const x = "yyy…y";`
Output: 4 parts. Part 1 is `` "```\n\n1/4" `` and part 4 is `` "```\n\n4/4" ``. Two of the four parts carry a fence marker and nothing else.

Fix: the same fix as 1.2. Start the grapheme split from `current`, not from zero.

### 1.4 A split code block loses its fences and its indentation — MEDIUM

`lib/transform/x.ts:46-63`, with `x.ts:70-73`

`splitLines` does not re-fence a chunk. `push` trims every chunk.

Input: a `ts` fence of 30 lines, each line indented by 4 spaces.
Output: 6 parts. Parts 3 to 6 carry no opening fence. Each of those parts also loses the 4-space indent of its first line, because `push` trims it. Part 6 carries a closing fence with no opener.

Fix: wrap each chunk in its own fence inside `splitLines`. Send a code part to `parts.push` without `trim()`.

### 1.5 A fence inside a list item or a blockquote is not a code block — MEDIUM

`lib/transform/ast.ts:66-82`

`toBlocks` reads the direct children of the root only.

Input: a list item that holds a `ts` fence of two lines.
Output: `x` is `["• item one\nconst a = 1;\nconst b = 2;\n\n1/1"]`. The code merges into the prose part and loses its fence. The `blog` output is correct for the same source, so the two outputs disagree. A blockquote behaves the same way.

This contradicts spec.md:72-74, "A fenced code block stays in its own part."

Fix: collect every `pre` descendant as its own block, not the direct children only.

### 1.6 A link whose text equals its target prints the URL twice — LOW

`lib/transform/ast.ts:78-80`

Input: `transform("<https://example.com/a>")`
Output: `linkedin` is `"https://example.com/a\nhttps://example.com/a"`. The form `[https://example.com/a](https://example.com/a)` repeats it too.

Fix: skip an href that `base` already contains.

### 1.7 The LinkedIn limit counts code units, and the X limit counts graphemes — LOW

`lib/transform/linkedin.ts:14,18`

Input: 500 family emoji.
Output: 3000 code units, which is 500 graphemes. The result is marked truncated, and LinkedIn would accept much more.

Fix: the fix for 1.1 removes this too.

### What I tested and found sound

- No part goes over 280 graphemes. I swept 200 to 3200 sentences, which is about 1200 parts.
- The `n/total` counter width stays correct across the same sweep. The fixed-point loop at `x.ts:119-127` converges, because part count rises as budget falls.
- An emoji sweep of 200 to 300 characters, with a family emoji, a flag and a skin tone, broke no grapheme cluster and went over no limit.
- Empty input, whitespace-only input and raw HTML input return the empty result and throw nothing.
- A 300-case fuzz over mixed words, emoji, URLs and sentence marks lost no content.

---

# 2. Scenario coverage in `specs/markdown-transform/spec.md`

### 2.1 Spec.md:68-70, the emoji scenario — the test is weaker than the scenario

`lib/transform/x.test.ts:48-56`

The scenario asks for two things: the emoji stays whole, and the part holds 280 graphemes or fewer. The test source gives two parts of 218 and 130 graphemes. Neither part comes near 280, so the limit never acts on the emoji. See section 3.1 for the proof.

Fix: use a source that lands the emoji on the boundary, such as `"a".repeat(278) + " 👨‍👩‍👧‍👦."`.

### 2.2 Spec.md:100-102, `meta.x.parts` is 3 — the test is weaker than the scenario

`lib/transform/index.test.ts:36-41`

The scenario names the number 3. The test asserts `x.length > 2`, then compares `meta.x.parts` with `x.length`.

Fix: use a source with a known part count. Assert that number.

### 2.3 Spec.md:6-7, no React import and no Next import — no test

No test asserts this rule. design.md:20 says every rule in `specs/` maps to a Vitest case.

Fix: read the four module sources in one test, or add an ESLint `no-restricted-imports` rule for `lib/`.

### 2.4 Spec.md:72-74, a fence in its own part — the test covers the top level only

`lib/transform/x.test.ts:58-82`

The test uses a top-level fence, which works. Finding 1.5 shows the nested case fails.

### 2.5 The hard-cut branch at `linkedin.ts:24` has no test

No case sends a first sentence longer than 3000 characters. That untested branch holds the defect in 1.1.

### 2.6 design.md:21-22 names four edge cases for the splitter. A URL has no test

design.md:21-22 lists "an emoji, a long sentence, a code fence, and a URL". `x.test.ts` covers the first three. No test in the diff sends a URL through the X thread. Finding 1.2 is the bug that a URL test would have caught.

### Scenarios that are covered, and covered well

Spec.md:9-19 (all four outputs, determinism, empty input), spec.md:26-32 (blog fence, blog link), spec.md:40-45 (email heading style, email monospace), spec.md:56-66 (one short part, sentence split, word-boundary split), spec.md:82-93 (emphasis removed, link on its own line, cut at a sentence). The word-boundary test at `x.test.ts:44-45` is a real test: its word round-trip fails if any part cuts a word.

---

# 3. Tests that pass even when the implementation is wrong

### 3.1 The emoji test, `x.test.ts:48-56` — proven twice

I built two mutant copies of the module and ran the five shipped test files against each one.

- Mutant A: `ast.ts:29` becomes `export const graphemes = (text: string): number => text.length;`. The count is now UTF-16 code units, and `Intl.Segmenter` no longer governs the limit. Result: 5 files passed, 22 tests passed.
- Mutant B: `ast.ts:38` becomes `const all = [...text];`. The split is now by code point, which cuts a family emoji into its 7 parts. Result: 5 files passed, 22 tests passed.

Both halves of the decision in design.md:38-42, `Intl.Segmenter` over `twitter-text`, have no test that holds them. The design document calls this the central decision of the change.

### 3.2 `index.test.ts:49` — the assertion repeats the implementation

`expect(result.meta.x.chars).toBe(result.x.join("").length)` restates `index.ts:109` word for word. It passes for any definition of `chars` that the implementation picks.

Fix: assert a literal number for a fixed source.

### 3.3 `index.test.ts:40` — the same shape

`expect(meta.x.parts).toBe(x.length)` restates `index.ts:109`. See 2.2.

### 3.4 `index.test.ts:19-21` — the determinism test is near-free

`expect(transform(SOURCE)).toEqual(transform(SOURCE))` on a synchronous pure function can only fail if module state leaks between calls. It is the spec scenario, so I would keep it. It is not evidence of much.

---

# 4. Contradictions with `AGENTS.md` and `design.md`

### 4.1 AGENTS.md:39 — `ast.ts` has no test beside it — LOW

AGENTS.md:39 says: "Pure logic lives in `lib/`, with no React import and no Next import. A Vitest test sits beside it."

`ast.ts` exports `graphemes`, `sentences`, `words`, `splitGraphemes` and `toBlocks`. No `ast.test.ts` exists. The coverage is indirect, through `index.ts`, and section 3.1 shows how loose that coverage is.

### 4.2 design.md:20 — one rule maps to no Vitest case — LOW

design.md:20 says: "Every rule in `specs/` maps to a Vitest case. A scenario that no test covers is not done." The React and Next rule of spec.md:6-7 has no case. See 2.3.

### 4.3 Spec drift: every URL moves to its own line in all four outputs — LOW

`lib/transform/ast.ts:79-80`

Spec.md:78-79 attaches this rule to LinkedIn, and gives the reason: "because LinkedIn breaks an inline link". The requirement for X at spec.md:47-53 does not ask for it. In the X thread the extra line spends part of the 280 budget.

### 4.4 Spec drift: a split does fall inside a word, and the spec allows no exemption — LOW

Spec.md:51 says: "A split MUST NOT fall inside a word." `x.ts:35-38` and `x.ts:58` cut inside a token when one token is longer than the whole budget. Finding 1.2 shows it on a 400-character URL. The comment at `x.ts:35` names this as the last resort, and no other answer exists for a token that long. The code is right and the spec is wrong. Task 6.8 asks you to edit the spec where reality does not match it. Add the exemption there.

### No rule violation found

- `pnpm check` exits 0: typecheck, lint, then the tests. Nothing is disabled to reach green.
- No file in `lib/` holds `eslint-disable`, `@ts-ignore` or `@ts-expect-error`.
- No file in `lib/` imports React or Next.
- The `as never` casts at `index.ts:94-95` rest on the claim in `ast.ts:1-7`. I verified that claim: `@types/hast@3.0.5` sits under `node_modules/.pnpm/` and does not resolve from a direct import. The hand-written type is the correct call here.
- Conventional Commits hold across the three commits. The red commit at 058e30f does say the test fails.
