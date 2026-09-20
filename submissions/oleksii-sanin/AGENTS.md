# Project rules — capstone, Oleksii Sanin

Stack: Next.js 16 · TypeScript · pnpm · Vitest. The app is not scaffolded yet.

Trust level 1 ("Assistant"): propose first. Wait for a human decision before you change more
than one file. Wait before you run anything that is not on the allow-list in `.claude/settings.json`.

## Read first

- `docs/capstone-spec.md` — when this project is done. Eight requirements, each with a command.
- `docs/mvp-plan.md` — what the product is, the week-one scope, and the cut list.
- `openspec/changes/<name>/` — the spec for the work in flight. Read `proposal.md`, `specs/` and
  `tasks.md` before you write code for that change.
- `.agent-log/README.md` — how the action log records what you did.

## Commands (pnpm only — never npm or yarn)

- `pnpm check` — typecheck + lint + tests. Run it before you say a task is done. Quote the output.
- `pnpm dev` — dev server on http://localhost:3000. Never start a second one.
- `pnpm hooks:selftest` — proves the hooks work, without an agent.
- `pnpm agent:log` — summary of `.agent-log/actions.jsonl`: what you actually did this session.

## Definition of done

- `pnpm check` is green. New behaviour has a test beside the code (`*.test.ts` / `*.test.tsx`).
- Evidence, not claims. Report the command you ran and its exit code or test count.
- The `reviewer` subagent read the diff. Record what it found, even when it found nothing.

## Next.js 16 rules that differ from older versions

- `params`, `searchParams`, `cookies()` and `headers()` are async. Always `await` them.
- Request interception is `proxy.ts`, which exports `proxy`. It is not `middleware.ts`.
- Caching is opt-in (`cacheComponents`, `'use cache'`). Do not enable it without a decision from me.
- Server Components are the default. Use `'use client'` for hooks, browser APIs and event handlers only.
- When you are unsure about an API, read `node_modules/next/dist/docs/` first. Do not guess.

## Conventions the linter does not enforce

- Pure logic lives in `lib/`, with no React import and no Next import. A Vitest test sits beside it.
- Route handlers in `app/api/**/route.ts` stay thin. They call `lib/`.
- Import alias `@/*` is this directory. Code, comments and commit messages are in English.
- Conventional Commits (`feat:`, `fix:`, `chore:`). One logical change per commit.

## Boundaries

- Ask before: you add a dependency, or you edit `next.config.ts`, `tsconfig.json`,
  `eslint.config.mjs`, `.claude/settings.json` or CI.
- Never: touch `.env*` (a hook blocks it anyway). Never delete a test to get green.
  Never disable a lint rule to get green. Never run `git push --force` or `rm -rf`.
- Never edit `.agent-log/` or `.claude/hooks/`. They record what you did. You do not write your own record.

## Claude Code

- Start in plan mode for anything that touches `app/api/**` or a config file. A one-line diff needs no plan.
- The `reviewer` subagent in `.claude/agents/` is the checker. The session that wrote the code never reviews it.
