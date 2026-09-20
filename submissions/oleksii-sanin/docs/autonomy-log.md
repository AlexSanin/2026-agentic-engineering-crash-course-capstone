# Autonomy log — capstone, markdown publisher

English translation of `templates/autonomy-log.md`. The upstream template is in Ukrainian, and it
stays untouched. The examples are deleted, as that template instructs. The rows below are real.

A row for each significant piece of work: **task → trust level → who decided → evidence → why that level.**

Three questions before each row:

1. **How fast do I see the error?** A red test in 20 seconds, or a user complaint in three days.
2. **How cleanly can I revert?** A `git checkout`, or a migration with no way back.
3. **What evidence convinces me?** A green run, a screenshot, a manual check. Name the exact one.

Course levels:

| Level | Name | Who does what |
|---|---|---|
| 1 | Assistant | The agent proposes. The human decides each action. |
| 2 | Assistant to agent | The agent edits files alone. Commands need permission. The human does not watch the process. |
| 3 | Agent | It reaches the goal alone, and it brings evidence. |
| 4 | Agents | Parallel subagents. The human merges the results. |
| 5 | Autonomous agents | The harness runs without a human. The human acts on exception only. |

---

## Entries

| # | Work | Level | Who decided | Evidence | Why this level |
|---|------|-------|-------------|----------|----------------|
| 1 | Product research with the Ideabrowser MCP | 1 · Assistant | The agent pulled 5 of 21 research sections. The human approved the write. | `docs/mvp-plan.md`, commit `591d479`. 21 `mcp__ideabrowser__*` calls in `.agent-log/actions.jsonl`. | The product choice sets everything after it. I wanted to read each source myself. |
| 2 | Agent harness: hooks, allow-list, `reviewer` subagent | 1 · Assistant | The human ran the commit. | Commit `709eb00`. `node scripts/hooks-selftest.mjs` prints 13 `PASS` lines. | Permanent boundary. The harness is always level 1. |
| 3 | `docs/capstone-spec.md`, the acceptance contract | 1 · Assistant | The human asked for the file. The agent wrote it. The human read it before the commit. | Commit `309b9ca`. | One file, and one `git revert` undoes it. |
| 4 | OpenSpec artifacts for `add-markdown-transform` | 1 · Assistant | The human closed two scope decisions first. The agent then wrote four artifacts. | Commit `c5d01ee`. `openspec validate add-markdown-transform --strict` reports valid. | The spec fixes the scope of every line of code that follows it. |
| 5 | The `Read first` section in `AGENTS.md` | 1 · Assistant | The human asked. | `AGENTS.md`, uncommitted at the time of this row. | A rules file. Permanent boundary. |
| 6 | Next.js 16 scaffold, Tailwind v4, Vitest, and the `check` command | 1 · Assistant | The agent asked once with the dependency list from `proposal.md`. The human approved it, then ran the commit. | Commit `8c4804a`. `pnpm check` exits 0. `pnpm hooks:selftest` prints 19 `PASS` lines. | A dependency and a build configuration. The permanent boundary list holds both at level 1. |
| 7 | Tailwind v4 in place of CSS modules | 1 · Assistant | The human reversed the agent mid-task, after the first scaffold had already landed in the working tree. | Commit `8c4804a`. `design.md` now carries the decision. `proposal.md` carries the two new dependencies. `tasks.md` 1.4 carries the step. | Same boundary as row 6. The reversal is the evidence that level 1 earned its cost here. |

---

## Level changes

**The most valuable row in the log.** Without one explicit change and its reason, the log shows only
that I kept a log.

### Raise

**2026-09-20, level 1 to level 2, for `lib/` edits only.** This section used to hold one condition,
written before the code existed: the level moves to 2 for `lib/` edits when `pnpm check` exists and
stays green. Commit `8c4804a` meets that condition. `pnpm check` exists and it exits 0. The detector
is a red Vitest run in seconds. The revert is one `git checkout` of a file that nothing imports yet.

The raise is narrow on purpose. It covers `lib/transform/` and the test files beside it. The agent
edits those files without a decision for each file. It still reports the command output and the exit
code.

Everything in **Permanent boundaries** below stays at level 1, and that includes the route handler at
`app/api/**`, which `AGENTS.md` sends through plan mode first.

### Lower

None yet. The first candidate is the `.env.local` file for the email capture. A hook blocks it, and
the key must never reach the log, so that step is human work from the start.

### An escalation I chose not to make

The agent produced four valid artifacts in a row with no correction. That tempts a move to level 3.
I did not move. A good hour is not evidence that the agent behaves correctly in this repository
without supervision.

---

## Permanent boundaries

Whatever level the rest of the work runs at, these stay at level 1:

- a change to the harness itself: `.claude/settings.json`, hooks, rules files;
- a change to a dependency or to the build configuration;
- anything that touches `.env*`, a key or a secret;
- anything that reaches production or changes data.

---

## What the agent proposed, and what did not run

Numbers, not memory. Output of `node scripts/agent-log-summary.mjs` over `.agent-log/actions.jsonl`,
on 2026-09-20. The per-tool table holds 21 rows, so only the headline and the blocked list are here.

```
Agent actions: 118 executed, 6 proposed but not executed, 1 failed — 5 session(s), 2026-09-20T07:26:44.555Z .. 2026-09-20T11:11:41.403Z

Proposed but not executed (blocked by a hook, a rule or you):
  2026-09-20T07:41:35.502Z  ExitPlanMode
  2026-09-20T07:43:41.554Z  WebFetch
  2026-09-20T07:43:42.690Z  WebFetch
  2026-09-20T10:32:02.572Z  Write  openspec/changes/scaffold-grouproll-week-one/proposal.md
  2026-09-20T10:44:03.618Z  mcp__ideabrowser__save_to_project
```

Two cases where the agent proposed something wrong, and I stopped it:

> **10:32, the change with the wrong name.** The agent proposed `Write` into
> `openspec/changes/scaffold-grouproll-week-one/proposal.md`. GroupRoll is not this product. The name
> came from an earlier idea that the research had already replaced. The write never ran. I deleted
> the folder. The change is now `add-markdown-transform`.

> **Later that day, an invented requirement.** The agent recommended a file `docs/decisions.md` and
> presented it as a rubric requirement. It had invented that filename itself, one turn earlier, in
> `docs/capstone-spec.md`. I asked where the name came from. The agent traced it, admitted the
> invention, and pointed at `templates/autonomy-log.md` instead. This file is the result. Nothing in
> the course names `docs/decisions.md`.
