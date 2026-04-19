# Updating agent-facing docs

The goal of this step is **orientation**, not duplication. Future agents and engineers
should be able to get their bearings in seconds after reading AGENTS.md / CLAUDE.md /
README.md — they should not find the same information copied from `plan.md` or
`requirements.md`.

## Principles

1. **Link, don't copy.** If a detail lives in `docs/features/<slug>/requirements.md`,
   link to it. Don't paste acceptance criteria into README.md.
2. **Keep AGENTS.md ≤ ~300 lines.** It's an index, not a manual. Grow with discipline.
3. **CLAUDE.md is usually a pointer.** Change it only when you have Claude-specific
   guidance to add.
4. **README.md is for humans.** User-visible behavior goes here, not internal patterns.
5. **CHANGELOG.md is for release engineering.** Reference the REQ id(s) so consumers
   can correlate user-visible changes to the requirements that drove them.

## AGENTS.md — what to update

### Always

- **Features list / development status.** Add a line for the feature. If there's a
  table or checklist, add/check the entry.

### Sometimes

- **Ground rules.** If the feature established a new convention (a new test `kind`,
  a new value-object pattern, a new utility location), add one sentence to the
  relevant ground-rule section with a link. Do not bloat the file.
- **Repository layout.** If the feature introduced a new top-level directory or a
  new ecosystem-native location (`alembic/versions/`, `lib/tasks/`, etc.), add it to
  the layout diagram.
- **Skill catalog.** If the feature added a new skill or reference file that agents
  should know about, update the catalog.

### Rarely

- **Phase routing diagram.** Only if the feature changed how phases interact.
- **Short versions** of extended docs (the "Requirements-as-migrations short
  version", "scenarios.yml short version", etc.) — only if the underlying model
  changed.

### Patterns to avoid

- **Copying acceptance criteria** from `requirements.md` into AGENTS.md.
- **Copying plan step lists** into AGENTS.md. Link to `plan.md` instead.
- **Tutorials or walkthroughs** — those belong in dedicated docs under `docs/`, not
  agent orientation.
- **Feature-specific coding rules.** If it's really a rule, it lives in the skill or
  a decision. AGENTS.md references where rules live.

## CLAUDE.md — when to update

Default: **don't touch it.** It typically contains:

```
# CLAUDE.md

This repo uses `AGENTS.md` as the primary agent guide. Claude Code should read that
file first.

<optional Claude-specific addenda>
```

Update only when:

- The feature introduced a Claude-specific guidance block (e.g. tool-use conventions,
  artifact handling that differs from other agents).
- The feature changed the name or location of AGENTS.md.

## README.md — what to update

README.md is human-facing. The audience is developers, operators, or end users of
whatever the repo produces.

### User-visible features

Add a short entry when the feature introduces:

- A new HTTP endpoint, CLI command, package export, or UI surface.
- A new configuration option or environment variable.
- A new runtime dependency the user must know about.
- A new operational concern (e.g. a migration that must be run on upgrade).

Format: one subsection per feature under an appropriate heading. Example:

```markdown
## URL shortener

Create short codes for long URLs and redirect on visit. See
[`docs/features/url-shortener/`](./docs/features/url-shortener/) for requirements,
plan, and scenarios.

- `POST /shorten` — create a short code from a long URL.
- `GET /:code` — resolve and redirect.
```

### Internal features

If the feature has no user-visible impact (e.g. a refactor, a port introduction, a
test harness improvement), do not add a README entry. The CHANGELOG and AGENTS.md
entries are sufficient.

## CHANGELOG.md — what to append

If the repo has a CHANGELOG, append an entry under the next unreleased version. Use
Keep-a-Changelog conventions if they're already in use, otherwise match the repo
style. Each entry should:

- Name the change in user-facing language.
- Reference the REQ id(s).
- Reference the scenarios.yml ids if there are user-testable behaviors.

Example:

```markdown
## [Unreleased]

### Added
- URL shortener with HTTPS validation and 7-char base62 codes. REQ-0042.
  Scenarios: `valid-https-returns-201`, `redirect-known-code-302`,
  `redirect-unknown-code-404`, `disallowed-schemes-rejected`,
  `redirect-perf-p95-150ms`.
```

## Commit discipline for doc updates

Doc updates as part of finalize should be a single commit separate from feature code,
titled `finalize REQ-NNNN: update agent docs` (or the repo's convention). This keeps
the feature commits focused on plan steps and the finalize pass reviewable on its own.

## Sanity-check prompts

Before declaring this step done, ask:

- If a new agent lands in this repo tomorrow, would AGENTS.md point them at this
  feature? If not, add a line.
- If an engineer lands in this repo tomorrow, would README.md tell them what the
  feature does at a high level (or direct them to the feature's doc folder)? If not,
  add a line.
- Did I copy any sentences verbatim from `requirements.md` or `plan.md`? If yes,
  replace them with a link.
