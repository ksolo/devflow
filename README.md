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

Install the full pipeline with the [`skills` CLI](https://www.npmjs.com/package/skills):

```bash
npx skills add ksolo/devflow
```

Or install just the pieces you want — every skill is independently installable:

```bash
# just the orchestrator + planning phases
npx skills add ksolo/devflow --skill devflow --skill gather-requirements --skill create-plan

# target a specific agent
npx skills add ksolo/devflow -a claude-code
npx skills add ksolo/devflow -a cursor
```

The `skills` CLI supports every agent it ships with —
[full list](https://www.npmjs.com/package/skills#supported-agents) — including
amp, antigravity, claude-code, codex, cursor, droid, gemini-cli, github-copilot,
goose, kilo, kiro-cli, opencode, roo, trae, windsurf, and more.

## Skills catalog

Every skill is self-contained under [`skills/`](./skills) and follows the
[Agent Skills specification](https://agentskills.io/specification): a `SKILL.md` with
YAML frontmatter plus optional `references/`, `scripts/`, and `assets/`. Click a skill
name to read its `SKILL.md`.

| Skill | Phase | What it does | Sample activation triggers |
|---|---|---|---|
| [`devflow`](./skills/devflow/SKILL.md) | 0. Orchestrator | Routes the user into the right phase; doesn't reimplement phase behavior. | *"let's start a feature"*, *"new feature"*, *"kick off work"*, *"which phase am I in"* |
| [`gather-requirements`](./skills/gather-requirements/SKILL.md) | 1. Requirements | Conversational Q&A producing a monotonically-numbered, immutable requirement with a `deltas:` block; dry-runs conflicts before acceptance. | *"requirements"*, *"change request"*, *"what do you want"*, *"supersede"* |
| [`create-plan`](./skills/create-plan/SKILL.md) | 2. Plan | Breaks the accepted requirement into commit-sized steps with Mermaid diagrams, `decisions.md`, and a spec-only `scenarios.yml` catalog. | *"plan this"*, *"break it down"*, *"TDD plan"*, *"step-by-step approach"* |
| [`implement-step`](./skills/implement-step/SKILL.md) | 3. Implement | Executes one plan step at a time with a strict TDD loop and SOLID (SRP/OCP/DIP) discipline; pauses at each commit boundary. | *"implement"*, *"next step"*, *"write the code"*, *"keep going"* |
| [`finalize-feature`](./skills/finalize-feature/SKILL.md) | 4. Finalize | Updates agent docs, empties `tmp/`, re-runs the full suite with the scenarios-coverage audit, and checks state-drift. | *"wrap up"*, *"finalize"*, *"update docs"*, *"ready for review"* |
| [`review-changes`](./skills/review-changes/SKILL.md) | 5. Review | Readability + security passes plus mechanical audits (scenarios-coverage, state-drift, traceability); block-severity findings route back. | *"review"*, *"audit"*, *"readability check"*, *"security review"* |

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

## Contributing

See [AGENTS.md](./AGENTS.md) for the full contribution workflow — `devflow` dogfoods
itself, so new features start in the `gather-requirements` phase.

Local checks before pushing:

```bash
asdf install && npm install   # first time only
npm run check                 # skills-ref validate + mermaid.parse
```

CI runs the same checks on every push and PR via
[`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## Status

Early development. See [plan / todos](./AGENTS.md#development-status) for what's built and what's next.

## License

[MIT](./LICENSE)
