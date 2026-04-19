# devflow

A collection of [Agent Skills](https://agentskills.io/) that encode a disciplined, phase-based
coding workflow for AI coding agents. Works across Claude Code, Codex, Cursor, Gemini, Copilot,
and any other agent that speaks the [Agent Skills spec](https://agentskills.io/specification).

## What it does

`devflow` teaches your coding agent to work the way you actually want it to:

1. **Align on requirements** before writing a line of code — conversational Q&A, outputs a committed requirements doc.
2. **Plan** in commit-sized steps with verification gates, Mermaid diagrams, captured decisions, and BDD scenario skeletons.
3. **Implement** one step at a time with a TDD inner loop, SOLID discipline (SRP / OCP / DIP), and pause-for-review boundaries.
4. **Finalize** by updating `AGENTS.md` / `CLAUDE.md`, cleaning up temp scripts, and running the full test suite with the scenarios-coverage audit.
5. **Review** the result for readability, maintainability, and security before handoff.

Under the hood, requirements are treated like database migrations: monotonically numbered, **immutable once accepted**, only changeable by superseding. A dry-run detects conflicts with prior requirements before new ones are accepted.

## Install

```bash
npx skills add ksolo/devflow
```

This works on every agent supported by the [`skills` CLI](https://skills.sh):
amp, antigravity, claude-code, codex, cursor, droid, gemini, gemini-cli, github-copilot,
goose, kilo, kiro-cli, opencode, roo, trae, windsurf.

## Skills catalog

| Skill | Phase | Activation triggers |
|---|---|---|
| `devflow` | Orchestrator | "let's start a feature", "new feature", "kick off work" |
| `gather-requirements` | 1. Requirements | "requirements", "what do you want", "change request" |
| `create-plan` | 2. Plan | "plan this", "break it down", "TDD plan" |
| `implement-step` | 3. Implement | "implement", "next step", "write the code" |
| `finalize-feature` | 4. Finalize | "wrap up", "finalize", "update docs", "handoff" |
| `review-changes` | 5. Review | "review", "audit", "readability check", "security review" |

Each skill is self-contained under [`skills/`](./skills) and follows the
[Agent Skills format](https://agentskills.io/specification): a `SKILL.md` with YAML frontmatter
plus optional `references/`, `scripts/`, and `assets/`.

## Repository layout

```
devflow/
├── skills/                 # the skills themselves (installed by the skills CLI)
├── examples/               # dogfooded sample features
├── AGENTS.md               # how agents should navigate this repo
├── CLAUDE.md               # pointer to AGENTS.md
├── LICENSE                 # MIT
└── README.md               # you are here
```

## Artifacts in your project

Once installed, the skills will create and maintain:

| Path | Purpose |
|---|---|
| `docs/features/<slug>/requirements.md` | Monotonically numbered, immutable once accepted |
| `docs/features/<slug>/plan.md` | Commit-sized steps with verification |
| `docs/features/<slug>/decisions.md` | Architectural decisions for this feature |
| `docs/features/<slug>/scenarios.yml` | Behavior catalog with links to native tests |
| `.devflow/state.yml` | Accumulated system contract (capabilities, budgets) |
| `.devflow/session.yml` | Current phase + active feature slug |
| `.devflow/log.jsonl` | Append-only acceptance log |

Location defaults above can be overridden per project; the skills auto-detect existing
`docs/`, `specs/`, or `features/` conventions and fall back to `docs/features/`.

## Status

Early development. See [plan / todos](./AGENTS.md#development-status) for what's built and what's next.

## License

[MIT](./LICENSE)
