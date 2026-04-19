# Traceability

The `req`, `plan_step`, and `decision` tags in `scenarios.yml` wire each scenario to the
documents that generated it. The `tests:` list wires each scenario to the code that proves
it. Together they make the workflow auditable end-to-end.

## The graph

```mermaid
flowchart LR
    req["requirements.md<br/>REQ-0042"] -->|tags.req| scenario["scenarios.yml<br/>scenario entry"]
    plan["plan.md<br/>step N"] -->|tags.plan_step| scenario
    decisions["decisions.md<br/>DEC-NNNN"] -->|tags.decision| scenario
    scenario -->|tests[].path + name| tests["native tests<br/>(unit, integration, load, ...)"]
    ci["CI report<br/>(JUnit XML)"] -.resolves.-> tests
    state["state.yml"] -.read by.-> req
    log["log.jsonl"] -.order.-> req
```

- `tags.req` is **required** on every scenario (schema hard-fail if missing).
- `tags.plan_step` is **required** on every scenario (schema hard-fail if missing).
- `tags.decision` is **optional** — apply when the scenario is the primary test of a
  specific architectural decision.
- `tests[]` is required unless `tags.status == spec-only`.

## Validation rules

`review-changes` walks these edges and enforces:

### Hard-fail

1. **Dangling link** — the id doesn't resolve.
   - `tags.req: [REQ-XXXX]` → no file with frontmatter `id: REQ-XXXX`.
   - `tags.plan_step: N` → no step N in the feature's `plan.md`.
   - `tags.decision: [DEC-XXXX]` → no entry with heading `## DEC-XXXX` in any
     `decisions.md`.
2. **Missing test file** — `tests[].path` does not exist on disk.
3. **Missing test name** — `tests[].name` does not match any discovered test within
   the referenced file.
4. **Status / report mismatch** — `status: passing` but tests in `tests:` failed in
   the latest CI report.

### Advisory (warn, don't fail)

1. **Reverse orphan** — a requirement acceptance criterion has no scenario covering it.
   The plan's coverage-check table makes this mapping explicit.
2. **Dead requirement reference** — `tags.req: [REQ-0017]` points to a `status:
   superseded` REQ. Update to the successor id or retire the scenario.
3. **Orphaned test file** — a test file exists that no scenario references. This is
   fine for pure-unit regression tests; the warning is informational.

## What to do when a reference breaks

- **REQ is superseded.** Update `tags.req` to the successor id **or** retire the
  scenario. Prefer retiring if the acceptance criterion itself was removed.
- **DEC is superseded.** Update `tags.decision` to the successor id. Decisions rarely
  cascade to scenario narrative.
- **Plan step renumbered after a revision.** Plan revisions should avoid renumbering
  existing steps — add new steps at higher numbers. If a renumber happens anyway,
  bulk-update `tags.plan_step` values across `scenarios.yml`.
- **Test file moved.** Update the `path` in the affected scenarios. The audit's
  advisory log lists every renamed test in one place for convenience.

## Multi-value `req`

A scenario may legitimately cover multiple requirements, especially for cross-cutting
behavior (security, observability, rate-limiting). List them:

```yaml
- id: rate-limited-create-returns-429
  tags:
    req: [REQ-0042, REQ-0055, REQ-0063]
    plan_step: 8
    status: spec-only
  description: |
    ...
```

Each id is walked independently during the audit.

## Linking scenarios to plan steps

`tags.plan_step` is the Phase 3 driver — it tells `implement-step` which scenarios
belong to the current commit. A step with no scenarios is an **infrastructure step**
and `plan.md` must flag it explicitly:

```markdown
### Step 2 — Define the Store port and InMemoryStore
- **Scenarios covered:** none directly (dependency for later scenarios).
```

Phase 3 is allowed to pass through such a step without pausing.

## Linking scenarios to tests

Each `tests[]` entry must be specific enough for the audit to resolve it unambiguously:

```yaml
tests:
  - path: tests/integration/shorten.test.ts
    name: "POST /shorten happy path returns 201 with 7-char code"
    kind: integration
  - path: tests/unit/code-generator.test.ts
    name: "generates 7-char base62 code"
    kind: unit
```

**Rules:**

- `path` is relative to the repo root.
- `name` must match the exact test name recorded in the framework's output (JUnit XML
  `<testcase name="...">`, or framework-native equivalent).
- `kind` communicates the test level so the audit can cross-check that e.g. every
  scenario marked `pause_after: true` has at least one integration/e2e/smoke test
  (not only unit tests).

## Where the ids come from

| Id type | Minted by | First appears in |
|---|---|---|
| `REQ-NNNN` | `gather-requirements` (Phase 1) | `requirements.md` frontmatter `id:` |
| `DEC-NNNN` | `create-plan` (Phase 2) | `decisions.md` entry heading |
| `plan_step: N` | `create-plan` (Phase 2) | `plan.md` step number |

All three are **monotonic and globally unique** across features:

- A new REQ takes `max(existing REQ ids) + 1` (padded to 4 digits).
- A new DEC takes `max(existing DEC ids) + 1`.
- Plan steps are per-plan, starting at 1.

## The state file and the log

Both are orthogonal to the traceability tags, but worth calling out:

- `.devflow/state.yml` is the **contract** snapshot. It doesn't carry scenario links —
  scenarios read the contract's capability/budget ids indirectly via their `tags.req`
  link.
- `.devflow/log.jsonl` is the **acceptance log**. It orders REQs for state regeneration
  and for the state-drift audit. Broken link checks can consult it to find superseded
  REQs.

## Example

```yaml
- id: valid-https-returns-201
  title: Valid HTTPS URL returns a 201 with a 7-char short code
  tags:
    req: [REQ-0042]
    plan_step: 3
    status: passing
    decision: [DEC-0004]
  description: |
    When a client submits "https://example.com/articles/42" to shorten
    Then the response status is 201
    And the response body contains a "code" of length 7
  tests:
    - path: tests/integration/shorten.test.ts
      name: "POST /shorten happy path returns 201 with 7-char code"
      kind: integration
    - path: tests/unit/code-generator.test.ts
      name: "generates 7-char base62 code"
      kind: unit
```

`review-changes` can verify:

- `REQ-0042` exists and is `status: accepted` ✓
- Plan step 3 of `plan.md` covers this scenario ✓
- `DEC-0004` exists in `decisions.md` ✓
- `tests/integration/shorten.test.ts` exists and contains a test named "POST /shorten
  happy path returns 201 with 7-char code" ✓
- `tests/unit/code-generator.test.ts` exists and contains "generates 7-char base62
  code" ✓
- Both tests passed in the latest CI report ✓

All green → traceability audit passes for this scenario.
