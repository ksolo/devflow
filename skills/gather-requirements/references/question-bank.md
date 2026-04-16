# Question bank

Canonical questions for the `gather-requirements` Q&A loop, organized by category. Ask **one
or two at a time**, never a wall. Skip categories that are clearly settled. If the engineer
doesn't know, record the question under *Open Questions* in the requirements file.

## 1. Context (why now, what problem)

- What problem does this solve, in one or two sentences?
- Who asked for this, and what's the underlying pain point?
- What happens today without it? (the baseline)
- Why now — is there a deadline, dependency, or triggering event?
- Is this a brand-new capability, a change to existing behavior, or a removal?
  - If a change or removal, which existing REQ-IDs does it touch?

## 2. Actors (who and what roles)

- Who uses this? (end users, admins, external systems, scheduled jobs, etc.)
- Does this introduce any new role or permission level?
- Are any existing actors' capabilities being expanded or narrowed?
- Does it interact with external systems? Which, and in what direction (calls them / is
  called by them)?

## 3. Functional (observable behavior)

Phrase every answer as "the system shall …" so it maps cleanly to a BDD scenario later.

- What's the primary happy-path behavior?
- What inputs must it accept, and in what shapes? (free form vs. enum, required vs. optional)
- What observable outputs must it produce? (responses, notifications, side effects)
- What state changes persist after the action completes?
- What are the allowable actions on existing state? (read / create / update / delete / list /
  search / export)

## 4. Non-functional (budgets, constraints, compliance)

These go into the `deltas.modifies` or `deltas.adds` as rules/budgets — see
[`state-file.md`](state-file.md).

- **Performance:** what latency / throughput / memory budget does this need to meet? (be
  concrete: `p95 < 200ms`, not "fast")
- **Availability:** any uptime target that didn't exist before?
- **Security:** does it touch auth, secrets, PII, financial data, health data? Any new
  attack surface?
- **Privacy / compliance:** GDPR, CCPA, HIPAA, PCI, SOC2 — anything that applies?
- **Accessibility:** WCAG level, screen-reader support, keyboard-only flows?
- **Internationalization:** locales, currencies, date formats, RTL?
- **Observability:** what must be logged / traced / metered?
- **Cost:** does it spin up expensive resources? Any ceiling?

## 5. Edge cases (failure, abuse, degenerate)

Worth asking even when answers feel obvious — the *Open Questions* that result are valuable.

- What happens on invalid input? (malformed, too large, missing, wrong type)
- What happens under network / dependency failure?
- What happens under rate-limit / quota exhaustion?
- What happens with concurrent modifications?
- What happens with an empty / zero / maximum case?
- What are the abuse paths? (enumeration, SSRF, injection, mass-assignment, race conditions)
- What happens on partial failure of a multi-step flow? (rollback? retry? poison queue?)
- What happens to data owned by a user who is deleted?

## 6. Out-of-scope (explicit non-goals)

This is one of the most valuable sections and routinely under-filled.

- What is this requirement explicitly **not** going to cover? (record each item)
- Is there a related capability the engineer might assume comes along? (name it and exclude
  it)
- Are there adjacent requirements that should be separate REQs? (list them as future work)

## 7. Acceptance criteria (testable, one line each)

Each criterion maps 1:1 to a BDD scenario in Phase 2. Phrase them as observable outcomes, not
internal implementation details.

- "A user with a valid short-code lands on the original URL within 150ms at p95."
- "Submitting an invalid long-URL returns a 400 with error code `invalid_url`."
- "A short-code collision retries up to 5 times before returning 503."

Prompts to elicit them:

- "What would make you say 'this works'?"
- "How do we know we're done?"
- "What's the smallest observable behavior that must hold?"

## 8. Supersede-specific questions

Ask these only when the draft references `supersedes:`.

- Which accepted REQ-IDs does this replace, fully or partially?
- For each superseded REQ, what changes (behavior, budget, scope)?
- Are there dependent REQs that referenced the superseded behavior? (check `.dev-flow/log.jsonl`)
- Should the superseded REQ's BDD scenarios be removed, updated, or kept as historical
  fixtures?

## When to stop asking

Stop when:

1. Every functional behavior has an acceptance criterion.
2. Every non-functional constraint has a numeric or enum value (or is explicitly unbounded).
3. Out-of-scope has at least one entry (if the list is genuinely empty, say so).
4. Open Questions is either empty or every entry is flagged as *will not block acceptance*.

If you're still asking after ~12 exchanges and not converging, stop and surface the root
ambiguity — likely the feature needs to be split into two requirements.
