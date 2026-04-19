# State verification

`.dev-flow/state.yml` is a **deterministic function** of `.dev-flow/log.jsonl` and the
set of accepted `requirements.md` files. If the checked-in `state.yml` disagrees with
a fresh regeneration, something is broken upstream: a requirement was accepted without
the log being updated, a log entry was hand-edited, or `state.yml` itself was mutated
by hand.

This check is the final safety net before `review-changes`. Phase 5 also runs it
(hard-fail); running it here catches drift before review starts.

## Regeneration algorithm (summary)

The authoritative description lives in
[`../../gather-requirements/references/state-file.md`](../../gather-requirements/references/state-file.md).
Summarized here:

```
state = empty
for entry in log.jsonl (append order):
  req = read docs/features/<entry.feature_slug>/requirements.md
  assert req.id == entry.id
  assert req.status == "accepted"
  for sup in req.supersedes:
    mark the corresponding REQ file status: superseded, superseded_by: req.id
  apply req.deltas to state:
    adds     -> insert; error on id collision
    modifies -> update; error if 'from' doesn't match current value
    removes  -> delete; error if id absent; error if referenced by surviving items
write state
```

The `state` written at the end is compared byte-for-byte (after canonical YAML
serialization) against the checked-in `state.yml`.

## Running the check

Pseudo-code the agent executes (manually or via a tooling script under `scripts/`):

```
regenerated = regenerate_state(log_path=".dev-flow/log.jsonl")
checked_in  = read_yaml(".dev-flow/state.yml")

if canonicalize(regenerated) == canonicalize(checked_in):
    drift = none
else:
    drift = diff(regenerated, checked_in)
    produce drift report and HALT
```

"Canonicalize" means:

- Sort keys at every level.
- Sort list entries with ids by id; leave other lists in declaration order.
- Normalize scalar whitespace.
- Use a single YAML dialect (no flow/block mixing).

If the repo has a `scripts/dev-flow/verify-state.sh` (or equivalent) that does this,
use it. Otherwise the agent performs the comparison in-memory.

## Drift report format

When drift is detected, produce a report and **stop the phase**. Do not attempt to
auto-fix `state.yml` — the drift indicates an upstream bug that needs human
understanding.

```
STATE DRIFT DETECTED

Log (head -> tail):
  REQ-0031 accepted 2026-04-02T14:10:00Z
  REQ-0038 accepted 2026-04-09T09:00:00Z
  REQ-0042 accepted 2026-04-16T17:30:00Z

Regenerated state.yml contains:
  budgets:
    url-shortener.redirect.latency-p95:
      value: 150ms
      source_req: REQ-0042

Checked-in state.yml contains:
  budgets:
    url-shortener.redirect.latency-p95:
      value: 200ms
      source_req: REQ-0031

Divergence:
  - budgets.url-shortener.redirect.latency-p95.value: regenerated=150ms, checked-in=200ms
  - budgets.url-shortener.redirect.latency-p95.source_req: regenerated=REQ-0042, checked-in=REQ-0031

Likely cause:
  REQ-0042's deltas modify the budget (from: 200ms -> to: 150ms), but state.yml
  was not re-committed after acceptance. Fix: regenerate state.yml, verify
  the regenerated value, commit.

Resolution paths:
  (a) Regenerate state.yml and commit (most common, and safe if the log is the
      source of truth).
  (b) If regeneration is wrong, the log itself has been corrupted — escalate to
      the engineer for manual investigation.
  (c) Do NOT hand-edit state.yml.
```

## Common drift causes

| Cause | Signal | Fix |
|---|---|---|
| Forgot to regenerate `state.yml` after accepting a new REQ | Regenerated is "ahead" of checked-in | Regenerate and commit |
| Hand-edited `state.yml` | Regenerated doesn't match; no recent REQ explains the diff | Revert `state.yml` to the regenerated version; if the hand-edit was intentional, it should have been a new REQ |
| Renamed a REQ id | Regenerated errors on assert req.id == entry.id | Undo rename; REQ ids are immutable |
| Deleted a REQ file still in the log | Regeneration fails (file not found) | Restore file from git history |
| Log entries out of order | Regeneration errors on `modifies.from` mismatch | Restore log from git; do not hand-edit |

## What to do after a clean check

If regeneration matches the checked-in state, record a one-line entry in the finalize
summary:

```
State.yml drift: none. (log entries: N, state bytes: M)
```

Then proceed to the final hand-off.

## What to do after a failed check

1. Produce the drift report above.
2. Update `.dev-flow/session.yml`: leave `phase: finalize-feature` (do not advance).
3. Tell the engineer: "State drift detected — details above. Resolve and re-enter
   finalize-feature."

Never advance to `review-changes` with unresolved drift.

## Edge cases

### First feature in a new repo

- `log.jsonl` contains only this feature's REQ(s).
- `state.yml` is regenerated from scratch. Drift should be zero; if it isn't, the
  REQ's `deltas:` block or the initial `state.yml` was wrong.

### A feature with only `deferred`/`flaky` scenarios and no newly-accepted REQs

- No log changes expected. Drift check passes trivially.

### Superseded-only feature (no new capabilities, just replacing a prior one)

- The new REQ's `deltas.supersedes` flips prior REQ status to `superseded`.
- The replacement deltas (adds/modifies/removes) do the structural work.
- Regeneration should match because the fold algorithm runs the replacement deltas
  in order.

### Polyglot repos with multiple `state.yml` files

- v1 assumes a single `.dev-flow/state.yml` at the repo root. Monorepos that need
  per-package state are out of scope for now; document the limitation in a DEC entry
  if the repo hits it.
