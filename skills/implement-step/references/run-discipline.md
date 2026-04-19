# Run discipline — scripts and temp artifacts

A common failure mode for coding agents is writing a lot of code before running any of
it. This document codifies the opposite: **run something executable at every
opportunity**, and be disciplined about the artifacts that generates.

## Three places code can live during Phase 3

| Location | Intent | Survives into finalize? | Cleaned up by |
|---|---|---|---|
| `src/` (or repo convention) | Production code | Yes | Never — it is the deliverable |
| `tests/` | Tests referenced by `scenarios.yml` `tests[].path` | Yes | Never |
| ecosystem-native location OR `scripts/` | Utilities meant to stay (seed data, manual smoke, demo, migrations, tasks) | Yes | Never; documented in plan.md |
| `tmp/` | Temporary probes, sketches, one-off REPL captures | **No** | `finalize-feature` deletes all of `tmp/` |

Anything that's "I just want to see if this works" goes under `tmp/`.

## `tmp/` — the sanctioned scratch zone

Rules:

1. Anything under `tmp/` is considered **ephemeral**.
2. `finalize-feature` runs `rm -rf tmp/` after confirming with the engineer.
3. `.gitignore` does **not** ignore `tmp/` — agents check scratch in so that paused
   sessions can resume seeing what's been tried, and so the engineer can review during
   pause checkpoints. Finalize removes it.
4. Scripts under `tmp/` should start with a comment naming the scenario or step they
   relate to, so the cleanup pass can confirm nothing orphaned remains:

   ```js
   // tmp/probe-shorten.js — probe for scenario: valid-https-returns-201 (step 3)
   ```

5. Do not import from `tmp/` in anything under `src/` or `tests/`. One-way
   dependency: production code and tests never see tmp.

## The keep-it zone — ecosystem conventions first, `scripts/` as fallback

Utilities that are part of the deliverable (migrations, tasks, seed data, smoke
checks, demos) should live wherever the repo's **ecosystem** conventionally places
them. Only fall back to a generic `scripts/` directory when the ecosystem has no
established home for that kind of utility, or when the repo already uses `scripts/`
consistently.

### Ecosystem conventions (prefer these)

| Language / framework | Utility kind | Canonical location |
|---|---|---|
| Ruby / Rails | DB migrations | `db/migrate/*.rb` |
| Ruby / Rails | CLI tasks | `lib/tasks/*.rake` (invoked via `rake <name>`) |
| Python / Alembic | DB migrations | `alembic/versions/*.py` |
| Python / Django | DB migrations | `<app>/migrations/*.py` |
| Python / Django | CLI tasks | `<app>/management/commands/*.py` (invoked via `manage.py <name>`) |
| Node / npm | CLI tasks & one-liners | `package.json` `scripts:` entries (invoked via `npm run <name>`) |
| Node | Executables | `bin/<name>` referenced from `package.json` `bin:` |
| Node / Prisma | DB migrations | `prisma/migrations/` |
| Node / Knex | DB migrations | `migrations/` (configured in `knexfile.js`) |
| Node / TypeORM | DB migrations | `src/migrations/` (configured in `datasource.ts`) |
| Go | Additional binaries | `cmd/<name>/main.go` |
| Go / golang-migrate | DB migrations | `db/migrations/*.sql` (or repo-defined) |
| Rust | Additional binaries | `src/bin/<name>.rs` |
| Rust | Build scripts | `build.rs` |
| Elixir / Phoenix | DB migrations | `priv/repo/migrations/` |
| Elixir | CLI tasks | `lib/mix/tasks/<name>.ex` (invoked via `mix <name>`) |
| Java / Maven | Build plugins | plugin config in `pom.xml` |
| Java / Flyway | DB migrations | `src/main/resources/db/migration/` |
| .NET / EF Core | DB migrations | `Migrations/` in the project |
| Make-based repos | Composite tasks | `Makefile` targets |

When extending a repo that already uses one of these conventions, **follow the
convention**. Adding a parallel `scripts/` directory in a Rails repo is a smell.

### When to fall back to `scripts/`

Use a top-level `scripts/` directory when:

- The repo has no ecosystem with an established home for the utility (e.g. a polyglot
  repo, a bare shell-first repo, a tooling monorepo).
- The repo already uses `scripts/` consistently for this kind of thing — match the
  existing convention.
- The utility is a thin shell wrapper (`scripts/dev.sh`, `scripts/ci-local.sh`) that
  composes several ecosystem-native commands.

Typical `scripts/` layout when it applies:

- `scripts/migrate.sh` — wrapper around whatever the ecosystem migration tool is.
- `scripts/smoke/<name>.sh` — end-to-end smoke checks referenceable from
  `scenarios.yml` with `kind: smoke`.
- `scripts/seed.ts` / `scripts/seed.py` — seed data for local dev, when the ecosystem
  doesn't already have a seed convention (e.g. Rails has `db/seeds.rb`, use that).

### Rules (regardless of location)

1. Every kept utility must be runnable from a fresh clone after whatever `install`
   step the repo convention requires. No hidden state.
2. Document every utility in `plan.md` under the step that introduced it. A brief
   "what it does / how to run it" block is enough. This applies to ecosystem-native
   files too (a new Alembic migration, a new rake task, a new `package.json` script).
3. If a scenario references a utility via `kind: smoke`, the utility is part of the
   scenarios-coverage audit: its exit code is its pass/fail signal.
4. Prefer the `kind: smoke` audit path over a `scripts/` README. If it's important
   enough to document, it's important enough to have a scenario.

### Deciding between ecosystem-native and `scripts/` in practice

1. Does the repo already have examples of this kind of utility somewhere? Put the new
   one next to the existing ones.
2. If not, does the language / framework have an idiomatic location? Use it.
3. If still not, use `scripts/`.
4. Record the choice as a DEC entry **only** when it's non-obvious or diverges from
   apparent repo convention.

## Running after every change

A good rhythm for each scenario:

1. Write / edit the test. **Run it.** (Expect red.)
2. Edit the implementation. **Run it.** (Expect green.)
3. Run the **full suite**, not just the current scenario's tests.
4. If the full suite stays green, commit (or move on in the current commit).

Never write more than ~30 minutes of code between runs. If you can't run because the
environment is broken, fixing the environment becomes the current task — escalate if
needed.

## Preferred "quick probe" patterns

### Node

```bash
# tmp/probe.mjs
import { ShortenerService } from '../src/domain/shortener.js';
const svc = new ShortenerService(/* minimal wiring */);
console.log(svc.create('https://example.com'));
```

Run: `node tmp/probe.mjs`.

### Python

```bash
# tmp/probe.py
from src.shortener import ShortenerService
svc = ShortenerService(...)
print(svc.create('https://example.com'))
```

Run: `python tmp/probe.py`.

### HTTP endpoints

```bash
# once the server is running locally
curl -sS -X POST localhost:3000/shorten -H 'content-type: application/json' -d '{"url":"https://example.com"}' | jq
curl -sI localhost:3000/abc1234
```

Capture the one-line output in the pause summary.

## Anti-patterns

- **Long speculative edits without running.** If you edit 5+ files without a run,
  stop and run.
- **Running only the failing test.** Re-run the full suite before declaring
  `passing`; otherwise you may have regressed something else.
- **Keeping `tmp/` scripts around after finalize.** They confuse future agents and
  bloat the repo.
- **Parallel `tmp/` and kept-utility versions of the same probe.** Pick one. If it's
  worth keeping, it lives in the ecosystem-native location (or `scripts/` as
  fallback) with documentation; if not, it stays in `tmp/` and gets deleted.
- **Creating `scripts/` alongside an existing ecosystem convention.** A Rails repo
  already has `lib/tasks/`, an Alembic repo already has `alembic/versions/` — using
  them keeps the repo coherent.

## What `finalize-feature` will check

When you hand off, `finalize-feature` will:

1. List `tmp/` contents and ask the engineer to confirm deletion.
2. Verify every utility introduced during this feature is referenced in `plan.md`
   (either in a step or under "Tooling introduced"), regardless of whether it lives
   in `scripts/`, `lib/tasks/`, `alembic/versions/`, `package.json` `scripts:`, etc.
3. Verify every scenario with `kind: smoke` in `tests:` points at a script that
   actually exists at the declared path.
4. Run the full test suite one last time.
