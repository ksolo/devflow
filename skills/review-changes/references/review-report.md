# Review report — schema and template

One report per review round. Written to the feature's artifact directory as
`docs/features/<feature-slug>/review-<round>.md` (or the repo's equivalent), where
`<round>` starts at 1 and increments for each re-review after block findings are
resolved.

## Severity tiers

| Tier | Meaning | Examples | Action |
|---|---|---|---|
| **block** | Merge-blocking. Fix before sign-off. | Security vuln, broken authz, scenarios-coverage failure, swallowed exception. | Route back to `implement-step` or `create-plan`. |
| **warn** | Should-fix-soon. Does not block this merge but creates follow-up debt. | SRP violation on internal helper, growing `switch` chain, missing doc on public API, primitive obsession in new code. | Engineer decides: fix now or file follow-up. Report names both options. |
| **info** | Advisory. Noted for context. | Unused imports, style-adjacent naming, pre-existing debt newly visible. | No action required. |

## When to use which tier

See [`readability-review.md`](readability-review.md) and
[`security-review.md`](security-review.md) for category-specific guidance. When
unsure:

- Correctness or security impact → **block**.
- Compounding risk (the 4th `switch` arm, the 2nd bare-string domain concept) →
  **warn**.
- Aesthetic or pre-existing → **info**.

## Report structure

````markdown
# Review report — <REQ ids / feature slug>

**Round:** <N>
**Reviewer:** <agent name + model + version>
**Date:** <ISO-8601 UTC>
**Feature base:** <git sha>
**Feature head:** <git sha>
**Changed files:** <N>

## Mechanical audits

- Scenarios-coverage: PASS | FAIL (<N> findings below)
- State-drift:        PASS | FAIL
- Traceability:       PASS | FAIL

## Block findings (N)

1. **[Security] <title>**
   - File: `<path>:<line>`
   - Evidence: `<quote>`
   - Rationale: <why this is block>
   - Resolution: <specific fix; route to implement-step / create-plan if needed>

2. **[Readability] <title>**
   - File: `<path>:<line>`
   - Evidence: `<quote>`
   - Rationale: <why this is block>
   - Resolution: <specific fix>

## Warn findings (N)

1. **[<Category>] <title>**
   - File: `<path>:<line>`
   - Evidence: `<quote>`
   - Rationale: <why this is warn>
   - Resolution (fix now): <option>
   - Resolution (defer): file follow-up tagged REQ-NNNN or issue-NNNN

## Info findings (N)

1. **[<Category>] <title>**
   - File: `<path>:<line>`
   - Note: <short>

## Deferred / flaky scenario review

- `<scenario-id>`: `deferred` — linked to <REQ / issue>. Accept.
- `<scenario-id>`: `flaky` — comment: "<quote from scenarios.yml>". Accept / reject.

## Scope documented

Surfaces examined for security:
- `<method> <path>` — auth: ✓ / N/A ; authz: ✓ / N/A ; validation: ✓ ; injection: ✓ ; ...
- `<CLI command>` — ...

Surfaces explicitly out of scope:
- `<path>` — <reason>

## Recommendation

**BLOCK** — <N> block findings above must be resolved before sign-off.
or
**SIGN-OFF** — no block findings. <N> warn and <N> info findings documented for
engineer review.

## Resolution log (populated in subsequent rounds)

- Round 1, finding #1: resolved in commit `<sha>` — confirmed <date>.
- Round 1, finding #2: resolved in commit `<sha>` — confirmed <date>.

---

<!-- Every subsequent round appends to this file or creates review-2.md etc.;
     pick whichever the repo prefers. The default is separate files so rounds
     are git-diffable. -->
````

## The "Evidence" field

Quote the offending code verbatim. Five lines max. Include enough context that the
engineer can find it without opening the file, but don't dump a whole function.
Elide with `// ...` if needed.

Example:

```
Evidence:
  db.query(
    "SELECT url FROM shortenings WHERE code='" + code + "'"
  )
```

## The "Rationale" field

One to three sentences. Cite the rule (`SRP`, `DIP`, `input-validation`,
`open-redirect`). Reference the reviewer-facing rule text when it's not obvious —
`readability-review.md § Dead code` or `security-review.md § Authorization`.

Bad rationale: "This is bad."
Good rationale: "Direct string concatenation into SQL. Violates input-validation
and parameterization rules; a caller can inject via the `code` path segment.
See `security-review.md § Injection`."

## The "Resolution" field

A **specific** fix. Not "improve this." The goal is that the engineer (or the
agent, routing back to an earlier phase) can act on it without another round of
review interpretation.

Good examples:

- "Route to `implement-step` on scenario `redirect-known-code-302`. Replace the
  string concatenation with `db.query('SELECT url FROM shortenings WHERE code =
  $1', [code])`. Add a negative-path scenario `redirect-injection-rejected` that
  asserts a code containing `'` returns 404 without hitting the DB."
- "Extract `UrlValidator` and `CodeGenerator` interfaces. Inject via constructor.
  Update `ShortenerService` tests to use fakes."
- "Delete. Unused since commit `<sha>`."

Bad examples:

- "Fix the SQL injection."
- "Refactor for SRP."
- "Consider improving readability."

## Routing rules for block findings

When a block finding requires a code fix → route to `implement-step` with the
scenario id.

When a block finding requires a new scenario or plan revision → route to
`create-plan`, which will add the scenario and plan step, then hand off to
`implement-step`.

When a block finding requires a new accepted requirement (the feature's scope was
wrong) → route to `gather-requirements` to accept a superseding REQ, which will
then flow forward through create-plan and implement-step.

Always name the routing target explicitly in the Resolution field.

## Re-review rounds

Round 2+:

1. Start with a diff of the feature head since Round 1's recommendation.
2. For each Round 1 block finding, verify:
   - The resolving commit(s) addressed the finding.
   - No new block findings were introduced by the fix (regression hunt).
3. Re-run mechanical audits.
4. Produce `review-2.md` (or append to `review-1.md`) with:
   - Resolution log entries for each prior finding.
   - Any new findings.
   - Updated recommendation.

## Sign-off conditions

Sign-off requires:

- All three mechanical audits PASS.
- Zero block findings.
- Warn / info findings are documented (acceptable to ship with warns; they're a
  trailing-debt ledger, not a gate).
- Deferred / flaky scenarios have linked follow-ups.
- Engineer has seen the report (explicit acknowledgment in session, or the report
  is committed and the engineer has engaged with it).

On sign-off:

- Update `.dev-flow/session.yml`: `phase: review-changes`, `status: review-complete`.
- The feature is now ready for whatever the repo's merge / release flow is. The
  agent does not open the PR or merge; that's an engineer action.

## Example: a sign-off report

```markdown
# Review report — REQ-0001 (url-shortener)

**Round:** 1
**Reviewer:** claude-opus-4.7
**Date:** 2026-04-17T14:00Z
**Feature base:** abc1234
**Feature head:** def5678
**Changed files:** 14

## Mechanical audits

- Scenarios-coverage: PASS
- State-drift:        PASS
- Traceability:       PASS

## Block findings (0)

None.

## Warn findings (2)

1. **[Readability] `ShortenerService.create` also validates URL scheme**
   - File: `src/domain/shortener.ts:24-41`
   - Evidence: scheme check inlined in `create`.
   - Rationale: SRP — validation and code-generation will evolve independently.
     Tests already bifurcate. See readability-review.md § SOLID subset.
   - Resolution (fix now): extract `UrlValidator` with a single `validate(raw: string): Url`
     method; inject into `ShortenerService`.
   - Resolution (defer): file follow-up REQ tagged `url-validator-extraction`.

2. **[Security] no rate limit on `POST /shorten`**
   - File: `src/api/shorten.ts:12`
   - Rationale: public unauth endpoint; classic amplification target. See
     security-review.md § Denial of service.
   - Resolution (fix now): apply `rateLimit({ max: 30, windowMs: 60_000 })`.
   - Resolution (defer): add `rate-limit-shorten-p1` scenario and ship in next
     feature.

## Info findings (1)

1. **[Naming] `src/utils.ts` is a catch-all**
   - File: `src/utils.ts`
   - Note: consider splitting by concern in a follow-up.

## Recommendation

**SIGN-OFF** — no block findings. 2 warn, 1 info documented above.
```
