# TDD loop — red / green / refactor

This is the canonical inner loop the `implement-step` skill runs **per scenario**.
Follow it literally. Cutting corners (writing code without a red test first, or
advancing to `passing` without re-running the suite) breaks the scenarios-coverage
audit in Phase 5.

## The three phases

### Red

Goal: produce tests that fail for the **right reason**.

- Write one test per entry in the scenario's `tests:` list.
- Name each test exactly as it appears in `tests[].name` — this is the contract the
  audit resolves against.
- Set up only what the test needs; no speculative fixtures.
- Run the suite. Verify the failures are:
  - **Expected:** message says "function not defined", "response undefined", "received
    200 expected 201", etc.
  - **Not:** syntax error, import error, module not found (those are mistakes, not
    red tests).

Advance `tags.status` to `tests-written` only when the red is correct.

### Green

Goal: smallest change to turn every test in `tests:` green.

- Add new files / modules / types first; mutate existing ones only when necessary
  (OCP).
- Don't generalize past what the tests require. Premature abstraction defers to the
  refactor phase.
- Don't touch unrelated tests. If a pre-existing test goes red during green, stop —
  you've changed behavior the plan didn't authorize.

Advance `tags.status` to `passing` only when **every** test in `tests:` is green
and no previously-passing test has regressed.

### Refactor

Goal: improve the shape of the code while tests stay green.

- Rename for clarity. Split long functions.
- Extract ports (interfaces) that make the dependency direction explicit (DIP).
- Collapse duplicated logic that emerged across multiple scenarios.
- **Do not rename tests.** Test names are part of the `scenarios.yml` contract.
- Re-run the suite after every non-trivial change. Don't batch refactors blindly.

## Bounded attempts

If you can't make a test green after a few focused tries, **stop**. Signals you've hit
the bound:

- You've attempted three distinct approaches and each failed in a different way.
- You're about to edit a test to make it pass (almost always wrong).
- You're about to edit an unrelated scenario's tests to make them pass.
- You're about to add a plan step that isn't in `plan.md`.

Any of these means the plan's assumption is broken. Escalate via section 7 of the
parent SKILL, not by changing the test to match the code.

## Stack-specific examples

### Node / vitest

```bash
# run only the tests for the current scenario (name match)
npx vitest run -t "POST /shorten happy path returns 201 with 7-char code"

# run the full suite after refactor
npm test

# machine-readable JUnit output for the Phase 5 audit
npx vitest run --reporter=junit --outputFile=reports/junit.xml
```

### Python / pytest

```bash
# run only the tests for the current scenario
pytest -k "test_post_shorten_happy_path" -v

# full suite
pytest

# JUnit output
pytest --junitxml=reports/junit.xml
```

### Go

```bash
# run one test
go test -run TestPostShortenHappyPath ./internal/api

# full module
go test ./...

# JUnit via go-junit-report
go test ./... -v 2>&1 | go-junit-report > reports/junit.xml
```

### Ruby / RSpec

```bash
# run one scenario's tests
bundle exec rspec --example "POST /shorten happy path returns 201 with 7-char code"

# full suite
bundle exec rspec

# JUnit output (rspec_junit_formatter gem)
bundle exec rspec --format RspecJunitFormatter --out reports/junit.xml
```

See `test-framework-adapters.md` for discovery commands and how the audit reads each
framework's output.

## What to commit and when

Default convention:

- **Option A — one commit per step** (default): all scenarios in the step reach
  `passing`, then commit as `step N: <title>`. Clean git log. Least ceremony.
- **Option B — red/green pairs**: commit each scenario's red state as `step N.m red:
  <scenario>` and its green state as `step N.m green: <scenario>`. Verbose log, rich
  TDD history.

Either is acceptable. The engineer sets the repo convention in `.dev-flow.yml`; the
default is Option A.

## What NOT to do

- Don't write production code before a red test exists for it.
- Don't mark a scenario `passing` before re-running the full suite (not just the one
  scenario's tests).
- Don't skip refactor. Even five minutes of naming cleanup earns its time back.
- Don't edit test names to match something the code accidentally did.
- Don't expand `tests:` with new entries during green or refactor. Add them before
  writing the tests, during the red phase.
