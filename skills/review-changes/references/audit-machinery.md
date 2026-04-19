# Audit machinery — the mechanical hard-fails

Three audits run before the judgment passes. Each one is deterministic and
hard-blocks merge on failure. `finalize-feature` (Phase 4) also runs a subset; this
phase's pass is the authoritative one.

## 1. Scenarios-coverage audit

### Inputs

- `docs/features/*/scenarios.yml` — every feature in the repo.
- Latest CI test report (JUnit XML or framework-native equivalent) under
  `reports/junit.xml` (or the repo convention).
- Load-test outputs for `kind: load` scenarios, in the tool's native format.
- Smoke-test script exit codes for `kind: smoke` scenarios.

### Checks (hard-fail on any)

| Rule | Check | Failure mode |
|---|---|---|
| S1 | Every `tests[].path` exists on disk. | Report missing path and the scenario id. |
| S2 | Every `tests[].name` is discoverable in its file (framework-specific). | Report unresolved name. |
| S3 | Every `status: passing` scenario has **all** its `tests:` green in the report. | Report the red test and scenario id. |
| S4 | No scenario is at `status: spec-only` or `status: tests-written`. | Report the incomplete scenarios. |
| S5 | `status: passing` with empty `tests: []`. | Report the scenario. |
| S6 | `locked: true` scenarios must not be modified since their lock timestamp. | Diff and report. |
| S7 | `status: flaky` has a YAML comment explaining the flake. | Report missing comment. |
| S8 | `status: deferred` has a YAML comment linking a follow-up REQ or issue. | Report missing link. |

### Framework-specific test-name resolution

Use the discovery commands documented in
[`../../implement-step/references/test-framework-adapters.md`](../../implement-step/references/test-framework-adapters.md).

If discovery isn't available for a given framework, fall back to grep for the test
name string in the file (heuristic warning-level, not block-level).

### Load-test resolution

For `kind: load`, parse the tool's output:

- autocannon JSON → `latency.p95` (ms).
- k6 summary JSON → `http_req_duration.p95`.
- locust CSV → p95 column per endpoint.

Compare against the scenario's `description` budget (e.g. "p95 < 150ms"). The
scenario passes when the captured value satisfies the budget. The audit treats the
budget as a constraint encoded in the scenario narrative; consumer repos may add a
structured `budget:` field later if needed.

### Smoke-test resolution

For `kind: smoke`: the script ran and exited 0 → pass. Non-zero → fail. Script
stderr is captured for the report.

## 2. State-drift audit

### Inputs

- `.devflow/log.jsonl` — append-only acceptance log.
- `.devflow/state.yml` — checked-in accumulated contract.
- Every `docs/features/*/requirements.md` referenced by the log.

### Algorithm

Identical to `finalize-feature`'s regeneration
([`../../finalize-feature/references/state-verification.md`](../../finalize-feature/references/state-verification.md)).
Summarized:

```
state = empty
for entry in log.jsonl:
  req = read docs/features/<entry.feature_slug>/requirements.md
  apply req.deltas to state (adds / modifies / removes / supersedes)
if canonicalize(state) != canonicalize(read(state.yml)): DRIFT
```

### Checks (hard-fail on any)

| Rule | Check | Failure mode |
|---|---|---|
| D1 | Regenerated state matches checked-in state. | Produce drift report naming first divergence. |
| D2 | Every log entry's REQ file exists and has `status: accepted`. | Report missing or non-accepted REQ. |
| D3 | Every superseded REQ referenced in the log has `status: superseded` in the file. | Report stale status. |
| D4 | No log entry uses a REQ id that appears more than once. | Report duplicate id. |

### Drift report format

See [`../../finalize-feature/references/state-verification.md`](../../finalize-feature/references/state-verification.md).
Copy the same format verbatim — consistent across phases.

## 3. Traceability audit

### Inputs

- Every `scenarios.yml` in the repo.
- Every `plan.md` in the repo.
- Every `decisions.md` in the repo.
- Every `requirements.md` in the repo (for REQ id resolution and status).

### Checks (hard-fail on any)

| Rule | Check | Failure mode |
|---|---|---|
| T1 | Every `tags.req: [REQ-NNNN]` resolves to a requirement file. | Report dangling ref. |
| T2 | Every `tags.plan_step: N` resolves to an existing step in the feature's `plan.md`. | Report dangling ref. |
| T3 | Every `tags.decision: [DEC-NNNN]` resolves to an entry in a `decisions.md`. | Report dangling ref. |
| T4 | No `tags.req` points at a superseded REQ on a live scenario. | Report dead reference. |
| T5 | Every REQ in `log.jsonl` has at least one scenario covering each of its acceptance criteria (coverage check from `plan.md`). | Report uncovered criterion. |
| T6 | Every test file referenced by `tests[].path` also belongs to a live scenario (no orphaned cross-references in the repo). | Warn, not block. |

### Reverse-orphan check (warn, not block)

For each acceptance criterion in each accepted `requirements.md`, ensure at least
one scenario tags it. If the plan's coverage table shows the mapping, this is
redundant; if not, warn.

## Report format when audits fail

```
MECHANICAL AUDIT FAILURES

Scenarios-coverage (2):
  S1: tests/integration/shorten.test.ts does not exist.
      Scenario: valid-https-returns-201

  S3: status: passing but test is red:
      tests/integration/redirect.test.ts :: "GET /:code with unknown code returns 404"
      Last run: 2026-04-17T08:42Z (CI job #1453)
      Scenario: redirect-unknown-code-404

State-drift: PASS

Traceability (1):
  T2: tags.plan_step=9 does not exist in docs/features/url-shortener/plan.md
      (max step is 7).
      Scenario: redirect-perf-p95-150ms

Resolution paths:
  - S1, T2: route to create-plan — plan or scenarios are out of sync.
  - S3: route to implement-step — regression on an existing scenario.

Do not proceed with readability / security review until the above are resolved.
```

## Why these are hard-fails

- **Coverage drift means the spec lies.** A scenario marked `passing` whose test
  isn't green is a claim the code no longer delivers. Shipping it silently undoes
  the whole "scenarios are spec, tests are proof" contract.
- **State drift means the contract is ambiguous.** The requirements-as-migrations
  model rests on `state.yml` being a deterministic function of the log. If it
  isn't, future conflict detection is unreliable.
- **Traceability drift means the audit can't be trusted.** A dangling `@plan-step`
  or `@decision` link means the traceability graph has rotted; future features will
  build on top of the rot.

These aren't stylistic issues. They're invariants. If they fail, the review can't
proceed — the ground under it is broken.
