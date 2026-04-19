# CLAUDE.md

This project follows the [AGENTS.md](./AGENTS.md) convention. All guidance for coding agents
— including Claude Code — lives there. Please read it before making changes.

Short version:

- This repo is a collection of [Agent Skills](https://agentskills.io/specification) encoding a
  phase-based coding workflow.
- Skills live under [`skills/`](./skills).
- Requirements are treated like database migrations: **immutable once accepted**, changeable
  only by superseding.
- Keep each `SKILL.md` under ~500 lines; push detail to `references/`.
- Stop at each plan step's commit boundary and await review.
- Run `npm run check` before committing (validates skill metadata + parses every Mermaid block).

See [AGENTS.md](./AGENTS.md) for the full workflow, repository layout, phase routing, and
development status.
