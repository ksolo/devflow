# Changelog

All notable changes to `devflow` are recorded here. The format is loosely based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[SemVer](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-04-19

First tagged pre-release. Covers the full phase pipeline plus CI plumbing.

### Added

- `skills/devflow/` — orchestrator (Phase 0). Intent routing + handoff; does not
  reimplement any phase's behavior. (Step 2)
- `skills/gather-requirements/` — Phase 1. Conversational requirements capture with the
  requirements-as-migrations dry-run: monotonic `REQ-xxxx` IDs, machine-readable
  `deltas:` block, and structural + declarative-state conflict detection before
  acceptance. (Step 3)
- `skills/create-plan/` — Phase 2. Commit-sized plan generation with Mermaid diagrams,
  `decisions.md` (ADR-lite), and a structured `scenarios.yml` catalog (spec-only
  entries, empty `tests:` lists populated in Phase 3). (Step 4)
- `skills/implement-step/` — Phase 3. TDD red/green/refactor loop with the SOLID subset
  (SRP / OCP / DIP), native-test wiring into `scenarios.yml`, temp-script run
  discipline, and pause-at-commit-boundary enforcement. (Step 5)
- `skills/finalize-feature/` — Phase 4. Docs refresh (AGENTS.md / CLAUDE.md / README /
  CHANGELOG), `tmp/` cleanup, full-suite run with the scenarios-coverage audit, and
  `.devflow/state.yml` drift re-check. (Step 6)
- `skills/review-changes/` — Phase 5. Readability + security review plus mechanical
  audits (scenarios-coverage, state-drift, traceability). Produces a severity-sorted
  review report; block-severity findings route back to `implement-step` or
  `create-plan`. (Step 7)
- `scripts/validate-skills.sh` — wrapper around
  [`skills-ref validate`](https://www.npmjs.com/package/skills-ref) that enforces the
  [Agent Skills spec](https://agentskills.io/specification) on every `skills/*/SKILL.md`. (Step 8)
- `scripts/check-mermaid.mjs` — pure-Node script that extracts every ` ```mermaid ` block
  from the repo's `.md` files and runs it through `mermaid.parse()`. No Chromium, no
  DOM. (Step 8)
- `.github/workflows/ci.yml` — skill-metadata validation, Mermaid parsing, and a
  non-blocking Markdown link check via [lychee](https://lychee.cli.rs/). (Step 8)
- `.tool-versions` — asdf-pinned Node version; read by both local tooling and
  `actions/setup-node` in CI. (Step 8)
- `package.json` — workspace-local tooling manifest (not published). Provides
  `npm run validate`, `npm run check-mermaid`, and `npm run check`. (Step 8)

### Changed

- Renamed the orchestrator skill and repo from `dev-flow` to `devflow`. All references
  updated across `skills/`, `README.md`, `AGENTS.md`, and `CLAUDE.md`.
- `README.md` — finalized skills catalog with per-skill install commands (via the
  [`skills` CLI](https://www.npmjs.com/package/skills)) and direct links to each
  `SKILL.md`. (Step 8)

[Unreleased]: https://github.com/ksolo/devflow/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ksolo/devflow/releases/tag/v0.1.0
