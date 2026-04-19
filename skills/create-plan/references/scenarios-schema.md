# scenarios.yml schema and tag vocabulary (v1)

`scenarios.yml` is the **specification of expected behavior** for a feature.
Each scenario links to one or more **tests** that prove it. Scenarios are not
runnable on their own; the tests (in the consumer repo's native framework) are
what CI actually runs. `review-changes` verifies the link.

This file is the authoritative schema. The template in
`scenarios-template.yml` demonstrates it.

## File shape

```yaml
schema: devflow.scenarios/v1
feature: <slug>                  # e.g. url-shortener
requirement: REQ-<NNNN>          # primary requirement; others are referenced via tags.req

scenarios:
  - id: <kebab-case-id>
    title: <short human sentence>
    tags:
      req: [REQ-NNNN, ...]
      plan_step: <int>
      status: spec-only|tests-written|passing|flaky|deferred
      decision: [DEC-NNNN, ...]      # optional
      owner: <handle>                # optional
      env: [local, ci, staging, ...] # optional
      browser: [chromium, firefox, webkit]  # optional, only for browser tests
      platform: [linux, macos, windows]     # optional
    pause_after: true|false        # optional, default false
    assumes: [<slug>, ...]         # optional; named assumptions engineer must confirm
    locked: true|false             # optional, default false; set only by engineer
    description: |
      <free-form narrative, Given/When/Then style recommended>
    examples:                      # optional; Scenario-Outline equivalent
      - { key: value, ... }
    tests:
      - path: <path/to/test/file>
        name: "<exact test name within the file>"
        kind: unit|integration|contract|e2e|load|smoke|security
```

## Required fields

- `schema`: must be `devflow.scenarios/v1`.
- `feature`: kebab-case feature slug matching the directory name.
- `requirement`: primary `REQ-NNNN` the scenarios satisfy.
- `scenarios[].id`: unique within the file, kebab-case.
- `scenarios[].title`: one-line human summary.
- `scenarios[].tags.req`: at least one `REQ-NNNN`.
- `scenarios[].tags.plan_step`: integer referencing a commit-sized step in `plan.md`.
- `scenarios[].tags.status`: one of the lifecycle values (see `status-lifecycle.md`).
- `scenarios[].description`: non-empty; narrative, not test code.
- `scenarios[].tests`: may be empty only when `status: spec-only`.

## Tag vocabulary

### `req` — requirement traceability

One or more `REQ-NNNN` values. Links this scenario to accepted requirements.
Multiple requirements may be satisfied by one scenario; cite all of them.

### `plan_step` — plan step traceability

Integer referencing a step number in `plan.md`. Exactly one step per scenario.
If a scenario legitimately spans steps, split it into two scenarios.

### `status` — lifecycle (see `status-lifecycle.md`)

- `spec-only` — scenario authored, no tests exist yet.
- `tests-written` — tests exist in `tests:` list but not all are green.
- `passing` — every test in `tests:` is green in the latest run.
- `flaky` — marked by engineer; audit warns; must stabilize before release.
- `deferred` — explicitly out of scope for this feature.

### `decision` — ADR-lite traceability

Zero or more `DEC-NNNN` values citing entries in `decisions.md`. Use when the
scenario is shaped by a specific architectural decision worth pointing to.

### `owner` — optional handle

For repos with multiple contributors; names the person responsible for keeping
this scenario green. Free-form slug.

### `env` — run-matrix environments

Which environments this scenario is expected to pass in. Defaults to all
configured environments if omitted. Values are free-form (`local`, `ci`,
`staging`) but should be consistent within a repo.

### `browser` — browser matrix

Only for scenarios with browser tests. Values from the Playwright/WebDriver
standard set (`chromium`, `firefox`, `webkit`).

### `platform` — OS matrix

Only for scenarios whose pass/fail depends on OS. Values: `linux`, `macos`,
`windows`.

## Scenario-level fields (not tags)

### `pause_after`

Boolean. When `true`, the `implement-step` phase stops after this scenario
reaches `passing` and awaits engineer review before proceeding. Use for commit
points, perf gates, and security-sensitive changes.

### `assumes`

List of named assumptions the engineer must confirm before the scenario can
move off `spec-only`. Example: `assumes: [autocannon-available]`. The
`implement-step` skill blocks on unresolved assumptions.

### `locked`

Boolean. When `true`, `review-changes` hard-fails if the scenario was modified
without a corresponding gather-requirements log entry since the lock was
applied. **Agents never self-apply `locked: true`.** Engineers set it after
explicit approval.

### `examples`

List of objects used as a Scenario-Outline equivalent. Each object is a set of
variable bindings; the scenario implicitly runs once per example. Tests in the
`tests:` list are expected to iterate over these examples.

## `tests:` — the proof list

Every entry requires:

- `path`: path relative to the consumer repo root.
- `name`: the exact test name as it appears in the test file (so the audit can
  resolve it unambiguously against JUnit / framework output).
- `kind`: one of `unit`, `integration`, `contract`, `e2e`, `load`, `smoke`,
  `security`. New kinds may be introduced per-repo via `.devflow.yml`.

A single scenario may list tests of different kinds — e.g. a unit test
covering the validator plus an integration test covering the endpoint. This
is expected and encouraged.

## Coverage audit (implemented by `review-changes`)

The audit reads `scenarios.yml` plus the latest CI report (JUnit XML or
framework-native equivalent) and enforces:

1. Every `tests[].path` exists on disk.
2. Every `tests[].name` is discoverable in that file (framework-specific:
   `vitest list`, `pytest --collect-only`, etc.).
3. Every `status: passing` scenario has **all** tests in `tests:` green.
4. Every `status: tests-written` scenario has at least one red test (otherwise
   it should be `passing`).
5. Every `status: spec-only` scenario has an empty `tests:` list.
6. `locked: true` scenarios were not modified since their lock timestamp.
7. Tag integrity: every `tags.req` resolves to an accepted requirement; every
   `tags.decision` resolves to a `DEC-NNNN` in `decisions.md`; `tags.plan_step`
   exists in `plan.md`.

Failures produce a scenarios-audit report with remediation options.

## Enforcement policy

- **Schema violations**: hard-fail. The file must parse and match the schema.
- **Missing required tags (`req`, `plan_step`, `status`)**: hard-fail.
- **Dangling traceability (`req`, `decision`, `plan_step` point nowhere)**:
  hard-fail.
- **Unknown tag keys**: warn. Reserved for future extension.
- **Unrecognized `status`, `kind`, `env`, `browser`, `platform` values**: warn
  unless repo config declares them.
- **`status: passing` with failing tests in report**: hard-fail.

This matches the "guided" philosophy used elsewhere in devflow: block only on
unambiguous correctness issues; nudge with warnings on style/vocabulary.
