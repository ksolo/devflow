# Test-framework adapters

Per-framework invocation, JUnit-XML output setup, and discovery commands. The
`scenarios.yml` coverage audit (Phase 5) reads JUnit XML or a framework-native
equivalent; every framework below has a one-command path to that format.

Every entry covers:

- **Detect** — what file pattern tells you this framework is in play.
- **Install** — if the framework isn't set up yet, the minimal add.
- **Run** — full suite command.
- **Run-one** — invoke a single test by name (used during the red/green loop).
- **Discover** — list tests without running them (used by audits).
- **JUnit output** — command that produces the machine-readable report.
- **`kind:` mapping** — which `tests[].kind` values this framework typically covers.

## Node — vitest (recommended default for new JS/TS repos)

| Field | Value |
|---|---|
| Detect | `package.json` contains `vitest` in deps |
| Install | `npm i -D vitest @vitest/coverage-v8` |
| Run | `npm test` (wire to `vitest run`) |
| Run-one | `npx vitest run -t "<test name>"` |
| Discover | `npx vitest list --reporter=json` |
| JUnit | `npx vitest run --reporter=junit --outputFile=reports/junit.xml` |
| Kinds | unit, integration, e2e (via playwright integration), contract |

## Node — jest

| Field | Value |
|---|---|
| Detect | `package.json` contains `jest` |
| Install | `npm i -D jest` |
| Run | `npm test` |
| Run-one | `npx jest -t "<test name>"` |
| Discover | `npx jest --listTests` (files only); names via `--json --testPathPattern` |
| JUnit | `npx jest --reporters=default --reporters=jest-junit` (requires `jest-junit`) |
| Kinds | unit, integration, contract |

## Python — pytest

| Field | Value |
|---|---|
| Detect | `pyproject.toml` with `[tool.pytest]` or `pytest.ini` or tests using `pytest` |
| Install | `pip install pytest` |
| Run | `pytest` |
| Run-one | `pytest -k "<test name pattern>" -v` |
| Discover | `pytest --collect-only -q` |
| JUnit | `pytest --junitxml=reports/junit.xml` |
| Kinds | unit, integration, contract, e2e |

### Python — pytest-playwright (for e2e/browser)

| Field | Value |
|---|---|
| Detect | `pytest` + `playwright` deps |
| Run | `pytest tests/e2e` |
| Kinds | e2e |

## Ruby — RSpec

| Field | Value |
|---|---|
| Detect | `Gemfile` contains `rspec`; `spec/` directory |
| Install | `bundle add rspec --group=test` |
| Run | `bundle exec rspec` |
| Run-one | `bundle exec rspec --example "<test name>"` |
| Discover | `bundle exec rspec --dry-run --format documentation` |
| JUnit | `bundle exec rspec --format RspecJunitFormatter --out reports/junit.xml` (requires `rspec_junit_formatter` gem) |
| Kinds | unit, integration, contract, e2e |

## Go — `go test`

| Field | Value |
|---|---|
| Detect | `go.mod` |
| Run | `go test ./...` |
| Run-one | `go test -run '<Regexp>' ./<pkg>` |
| Discover | `go test -list '.*' ./...` |
| JUnit | `go test ./... -v 2>&1 \| go-junit-report > reports/junit.xml` (install `github.com/jstemmer/go-junit-report/v2`) |
| Kinds | unit, integration, contract, e2e |

## Rust — `cargo test`

| Field | Value |
|---|---|
| Detect | `Cargo.toml` |
| Run | `cargo test` |
| Run-one | `cargo test <name>` |
| Discover | `cargo test -- --list` |
| JUnit | `cargo nextest run --message-format junit` (requires `cargo-nextest`) |
| Kinds | unit, integration |

## Java / Kotlin — JUnit 5

| Field | Value |
|---|---|
| Detect | `pom.xml` or `build.gradle` with junit-jupiter |
| Run | `mvn test` or `./gradlew test` |
| Run-one | `mvn -Dtest=<Class>#<method> test` |
| JUnit | native — reports under `target/surefire-reports/` |
| Kinds | unit, integration, contract |

## Load testing — autocannon (Node) / k6 / locust

For `tests[].kind: load`:

| Tool | Command | Output the audit expects |
|---|---|---|
| autocannon | `npx autocannon -c 100 -d 60 -j <url>` | JSON with `latency.p95` |
| k6 | `k6 run --summary-export=reports/k6.json tests/load/foo.js` | JSON summary with `http_req_duration.p95` |
| locust | `locust --headless -u 100 -r 10 -t 60s --csv reports/locust` | CSVs; agent parses p95 |

Load tests do **not** produce JUnit XML. The audit reads their specific output format
when `kind: load` is present. Document the tool choice in `decisions.md`.

## Smoke testing — scripts under `scripts/`

For `tests[].kind: smoke`:

- The test "runs" by executing an in-repo script and asserting its exit code.
- `scripts/smoke/<name>.sh` is the convention. The script must exit 0 on success,
  non-zero on failure, and print a one-line summary.
- The audit treats a 0 exit as green, non-zero as red. `tests[].name` is the script
  filename.

## Contract testing — Pact (or similar)

For `tests[].kind: contract`:

- Consumer-side tests produce pact files that are verified against provider tests.
- Treat the consumer pact generation as one test entry and the provider verification
  as another, each with its own path.
- Pact CLI supports JUnit output: `pact-broker can-i-deploy ... --output junit`.

## End-to-end testing — Playwright / Cypress

For `tests[].kind: e2e`:

| Tool | Run-one | JUnit |
|---|---|---|
| Playwright | `npx playwright test -g "<test name>"` | `--reporter=junit` |
| Cypress | `npx cypress run --spec <path> --env grepTags=@<tag>` | via `cypress-junit-reporter` plugin |

## Security testing

For `tests[].kind: security`:

- Use the same framework as unit/integration for attack-surface tests (XSS, auth
  bypass attempts, injection, rate-limit violations).
- Dedicated scanners (semgrep, trivy, bandit) are complementary but don't participate
  in the scenarios-coverage audit v1. They run under Phase 5's security pass instead.

## Detection order

If the repo has multiple signals (e.g. both Python and JS), prefer:

1. The framework referenced in `decisions.md` (explicit choice).
2. The framework with the most existing tests.
3. The one that matches the language of the file the scenario's `tests[].path` points
   at.

Ambiguity here is a decision that belongs in `decisions.md` — escalate rather than
guess.
