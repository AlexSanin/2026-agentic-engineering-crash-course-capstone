@AGENTS.md

## Claude Code

- Start in plan mode for anything that touches `app/api/**` or a config file. A one-line diff needs no plan.
- The `reviewer` subagent in `.claude/agents/` is the checker. The session that wrote the code never reviews it.
