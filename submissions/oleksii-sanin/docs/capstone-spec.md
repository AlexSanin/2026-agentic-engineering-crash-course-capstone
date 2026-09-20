# Capstone completion spec

Date: 2026-09-20. Owner: Oleksii Sanin. Status: draft.

This file defines when the capstone is complete. It is the acceptance contract for the submission.

- The product plan is in `docs/mvp-plan.md`. This file does not restate it.
- The course rules are in `../../README.md` and `../../RUBRIC.md`. This file does not restate them.
- This file maps each course rule to one artifact in this repository, and to one command that proves the artifact works.

## Scope

In scope: a thin slice of the week-one product, the agent harness, the proof trail, and the submission.

Out of scope: accounts, a database, publish integrations, a scheduler, payment, and the AI hook generator. `docs/mvp-plan.md` holds the full cut list.

A named practice without a link is out of scope too. It is the one frequent cause of rework.

## Definition of done

The capstone is complete when the eight requirements below pass. Rules:

1. Each requirement names one artifact and one verification step.
2. A requirement passes when a reviewer can open the artifact without a login.
3. A requirement with a claim but no artifact does not pass.

## R1 — The product runs

A thin slice of `docs/mvp-plan.md` works end to end.

- `lib/transform/` holds the transform as a pure function. It imports no React module and no Next module.
- The function returns all four outputs: blog HTML, email HTML, X thread parts, and LinkedIn text.
- One page accepts markdown text. It shows the four outputs.
- One route handler in `app/api/**/route.ts` stays thin. It calls `lib/`.

**Verify:** `pnpm dev`, then paste one real post from `docs/mvp-plan.md` day 5. All four outputs appear.

**Status today:** not met. The app is not scaffolded.

## R2 — One command verifies the project

- `package.json` defines `check` as typecheck, then lint, then tests.
- Every new behaviour in `lib/` has a Vitest file beside it.
- The X thread splitter has a test for each edge case: a long sentence, a code fence, and a link at the limit.

**Verify:** `pnpm check` exits 0. Quote the output and the test count in the PR.

**Status today:** not met. No `package.json` exists, so `pnpm check` cannot run.

## R3 — A test was red, then green

This is the strongest verification proof in the rubric.

- One commit adds a failing test. The commit message says the test fails.
- The next commit makes it pass. It changes `lib/`, not the test.

**Verify:** `git log --oneline` shows the two commits in that order. The PR links both.

**Status today:** not met.

## R4 — Context engineering acted, not just existed

- `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json` and `.claude/hooks/` stay committed.
- `.agent-log/actions.jsonl` records what the agent proposed and what actually ran.
- At least one blocked action stays in the log. A blocked action is a `PreToolUse` line with no matching `Post` line.
- The PR quotes one blocked action and says which rule blocked it.

**Verify:** `pnpm agent:log`. The report lists the blocked actions.

**Status today:** partly met. The log holds 160 lines across 5 sessions, and 6 blocked actions. `pnpm agent:log` needs `package.json`.

## R5 — A loop ran to green

- One script repeats `pnpm check` until the exit code is 0, or until it reaches a retry cap.
- The output of one real run is saved under `docs/runs/`.
- The saved run shows the iteration count and the stop reason.

**Verify:** run the script once. Commit its output. Do not describe the loop in words only.

**Status today:** not met.

## R6 — maker is not checker

- The `reviewer` subagent in `.claude/agents/reviewer.md` reads the diff. The session that wrote the code never reviews it.
- Each review output is saved under `docs/reviews/` with a date and the reviewed commit.
- An empty review counts. Record it as an empty review, and say so.

**Verify:** `docs/reviews/` holds at least two files. At least one names a real finding.

**Status today:** not met. The subagent exists. No review output exists.

## R7 — The spec came before the code

- The week-one work goes through one OpenSpec change under `openspec/changes/`.
- The change artifacts are committed before the first code commit.
- Where reality did not match the spec, the spec is edited, and the edit is a separate commit.

**Verify:** `git log --oneline --reverse` shows the spec commit before the first `lib/` commit.

**Status today:** not met. `openspec/config.yaml` is committed. No change exists.

## R8 — The submission is honest and complete

- The branch `oleksii-sanin` is pushed to `origin`.
- A pull request to upstream uses `.github/PULL_REQUEST_TEMPLATE.md`. It stays open.
- Every checked practice in the template carries a permalink to a file, a commit, a test or a run.
- A 1 to 2 minute video shows the product, and says how the work was built with an agent.
- One section states which decisions were mine, and which were the agent's.
- `docs/autonomy-log.md` records the work as it happens. It names at least one agent error and one reverted step.

**Verify:** open the PR in a private browser window. Every link resolves without a login.

**Status today:** not met. The branch is local only.

## Traps

The rubric returns work for four reasons. Each one has a countermeasure here.

1. **A practice without proof.** Countermeasure: R1 to R7 each name a file path.
2. **A record written after the fact.** Countermeasure: `docs/autonomy-log.md` grows during the work, not before the submission.
3. **A story where nothing failed.** Countermeasure: R8 requires one agent error and one reverted step.
4. **A video longer than 2 minutes.** Countermeasure: record the video last, from a script.

## Verification summary

| # | Requirement | Command or artifact |
| --- | --- | --- |
| R1 | The product runs | `pnpm dev` |
| R2 | One command verifies | `pnpm check` |
| R3 | Red, then green | `git log --oneline` |
| R4 | Context engineering acted | `pnpm agent:log` |
| R5 | A loop ran to green | `docs/runs/` |
| R6 | maker is not checker | `docs/reviews/` |
| R7 | The spec came first | `openspec/changes/`, commit order |
| R8 | The submission is complete | the open pull request |

## Open decisions

These belong to the human. Work does not start on them until they are closed.

1. Does the thin slice ship the landing page first, as day 1 of `docs/mvp-plan.md` says? Or does `lib/transform` come first?
2. Does the X thread splitter ship with the grapheme count ceiling, or with `twitter-text`?
3. Is the demo video recorded against local `pnpm dev`, or against a Vercel deployment?
