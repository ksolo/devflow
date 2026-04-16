# `.dev-flow/state.yml` and the `deltas:` block

`state.yml` is the **accumulated system contract** for the consumer repo. It is
deterministically rebuilt from the ordered acceptance log (`.dev-flow/log.jsonl`) by folding
each accepted requirement's `deltas:` block in order.

Treat it like a compiled artifact: check it in so PRs show contract drift, but never
hand-edit it.

## Schema

```yaml
# .dev-flow/state.yml
schema_version: 1
built_at: 2026-04-16T16:45:00Z       # timestamp of last regeneration
built_from: .dev-flow/log.jsonl      # always this; aids reproducibility

capabilities:                        # things the system can do
  - id: <namespaced-kebab-case>      # e.g. url-shortener.create
    actors: [<actor-id>, ...]
    summary: <one-line description>
    introduced_by: REQ-0042          # the REQ id that added it
    last_modified_by: REQ-0042       # latest REQ that modified it

actors:                              # who/what interacts with the system
  - id: <kebab-case>                 # e.g. end-user, visitor, admin, scheduled-job
    summary: <one-line description>
    introduced_by: REQ-0042
    last_modified_by: REQ-0042

rules:                               # enum-valued or structural rules
  - id: <namespaced-kebab-case>      # e.g. url-shortener.allowed-schemes
    value: <scalar or list>          # e.g. [http, https] or "kebab-case-enum-value"
    introduced_by: REQ-0042
    last_modified_by: REQ-0042

budgets:                             # numeric constraints (perf, availability, cost, etc.)
  - id: <namespaced-kebab-case>      # e.g. url-shortener.redirect.latency-p95
    value: 150                       # normalized to a number
    unit: ms                         # ms | s | percent | rps | bytes | count | currency
    scope: request | monthly | daily | global
    introduced_by: REQ-0042
    last_modified_by: REQ-0042
```

### Value normalization for budgets

Budgets are normalized to `{ value: <number>, unit: <enum> }` so Tier 2 can do numeric
comparisons. Accepted units:

| Unit | Meaning |
|---|---|
| `ms`, `s` | duration |
| `percent` | 0-100 |
| `rps` | requests per second |
| `bytes`, `kb`, `mb`, `gb` | size |
| `count` | unitless integer (e.g. max retries) |
| `currency` | monetary; pair with `currency_code` field (e.g. `USD`) |

If a requirement writes `150ms`, normalize to `value: 150, unit: ms` when applying the delta.

## The `deltas:` block (inside each requirement file)

```yaml
adds:
  capabilities: [...]       # same schema as state.capabilities items (minus introduced_by/last_modified_by)
  actors: [...]             # same schema as state.actors items
  rules: [...]
  budgets: [...]

modifies:
  capabilities:
    - id: url-shortener.create
      change: summary | actors
      to: <new value>
  rules:
    - id: url-shortener.allowed-schemes
      from: [http, https]   # must equal the current state value; dry-run checks this
      to: [https]
  budgets:
    - id: url-shortener.redirect.latency-p95
      from: 150ms
      to: 100ms

removes:
  capabilities: [<id>, ...]
  actors: [<id>, ...]
  rules: [<id>, ...]
  budgets: [<id>, ...]

supersedes: [REQ-0017]      # mirrors the frontmatter; redundant by design for resilience
```

Notes:

- Every `modifies` entry must specify `from:` so the dry-run can verify the state file hasn't
  drifted.
- `adds` must not collide with existing ids. `removes` must reference ids that exist.
- `supersedes:` in the deltas block must exactly match `supersedes:` in the frontmatter —
  the dry-run fails if they disagree.

## Fold algorithm (how state.yml is regenerated)

Given `log.jsonl` in append order, produce `state.yml`:

```
state = empty state
for each entry in log.jsonl:
  req = read docs/features/<entry.feature>/requirements.md
  assert req.status == "accepted"
  assert req.id == entry.id
  for each superseded_id in req.supersedes:
    mark the corresponding REQ file status: superseded, superseded_by: req.id
    (no structural change to state -- the replacement delta does all the work)
  apply req.deltas to state:
    adds     -> insert items; error on id collision with existing
    modifies -> update items; error if 'from' doesn't match current value
    removes  -> delete items; error if id not present; error if any other state item
                references the removed id (e.g. a capability referencing a removed actor)
  set state.built_at = now()
write state.yml
```

The algorithm is deterministic: same log → same state.yml, byte for byte. That's what makes
the **state-drift audit** in `review-changes` possible.

## Why a single repo-wide state file (not per-feature)

Conflicts cross feature boundaries. A rate-limit budget introduced by REQ-0042 in
`url-shortener` can be contradicted by REQ-0055 in `admin-panel`. A single state file is the
only way Tier 2 conflict detection can catch that.

## Idempotency

If the deltas of an accepted requirement are re-applied to the state it produced, the result
is identical. This lets you rebuild state.yml from scratch at any time:

```bash
rm .dev-flow/state.yml
# replay the log in order, fold each requirement's deltas
# result must equal the checked-in file (or the state-drift audit fails)
```

## What this file does NOT contain

- Implementation details (class names, file paths, code).
- Time-varying data (counters, latest deploy, feature-flag values).
- Anything not declared in an accepted requirement's `deltas:` block.

Those belong in code, telemetry, or feature-flag services — not in the system contract.
