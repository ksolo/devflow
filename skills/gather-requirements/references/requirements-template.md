# Requirements template

Copy the block below to `docs/features/<feature-slug>/requirements.md` and fill every section.
The YAML frontmatter and the trailing `deltas:` block are both load-bearing — the dry-run
reads them.

---

````markdown
---
id: REQ-0042
feature: url-shortener
title: Shorten a long URL and redirect on visit
status: draft                 # draft | accepted | superseded | rejected
created_at: 2026-04-16T16:00:00Z
accepted_at: null             # set on acceptance
author: kevin
supersedes: []                # e.g. [REQ-0017]
superseded_by: null           # set when a later REQ replaces this one
---

# REQ-0042 — Shorten a long URL and redirect on visit

## Context

<!-- Why now, what problem, who asked, what happens today without this. 2-5 sentences. -->

## Actors

<!-- Bullet list. For each actor, one line on what they do related to this feature. -->

- **End user** — submits a long URL and receives a short code.
- **Visitor** — opens a short code and is redirected to the original URL.

## Functional requirements

<!-- Phrase as "the system shall ...". Each item should map to an acceptance criterion. -->

1. The system shall accept a well-formed HTTP/HTTPS URL and return a short code.
2. The system shall redirect visitors to the original URL on visit to the short code.
3. The system shall ...

## Non-functional requirements

<!-- Concrete numeric or enum values. "Fast" is not acceptable; "p95 < 150ms" is. -->

- **Performance:** redirect responses must complete at p95 < 150ms under 100 rps.
- **Availability:** redirect endpoint must target 99.9% monthly availability.
- **Security:** short-code creation must not accept `javascript:` / `data:` / `file:` URLs.
- **Observability:** every create and redirect must emit a structured log with
  `short_code`, `long_url_hash` (sha256), latency, and outcome.

## Edge cases

- Invalid URL format → 400 with `error.code = invalid_url`.
- Short-code collision → retry up to 5 times; if still colliding, 503 with `Retry-After: 1`.
- Unknown short-code on visit → 404 with a generic "link not found" page.
- Deleted owner → short codes continue to resolve (decision recorded in decisions.md).

## Out-of-scope

<!-- Name the things this requirement does NOT cover. Be generous. -->

- Custom vanity short codes.
- Link expiry / TTL.
- Click analytics beyond the structured log line.
- Any UI — this is API-only. A UI is a separate future REQ.

## Acceptance criteria

<!-- Each becomes a BDD scenario in Phase 2. Observable, testable, one line each. -->

1. Submitting a valid HTTPS URL returns a 201 with a 7-character short code.
2. Visiting the returned short code with GET responds 302 to the original URL.
3. Visiting an unknown short code with GET responds 404 with the error page.
4. Submitting a `javascript:` URL returns a 400 with `error.code = invalid_url`.
5. Creating returns within p95 150ms at 100 rps (measured via load test in CI).

## Open questions

<!-- Things the engineer didn't have an answer for. Flag whether they block acceptance. -->

- [ ] Should short codes be case-sensitive? (non-blocking — default: yes)
- [ ] Anonymous rate limit ceiling? (blocking — need before acceptance)

## Decision notes

<!-- Record any design decisions made during Q&A that aren't obvious from the text above.
     Link to decisions.md once Phase 2 runs. -->

- Chose 7-character base62 codes to keep collision probability < 1 in 10^6 up to 10B codes.

## Supersedes

<!-- Required when `supersedes:` frontmatter is non-empty. Explain what changes and why. -->

N/A (nothing being superseded).

---

## deltas

<!-- MACHINE-READABLE. Do not reformat. The dry-run parses this block. -->
<!-- See skills/gather-requirements/references/state-file.md for schema. -->

```yaml
# --- delta ---------------------------------------------------------------
adds:
  capabilities:
    - id: url-shortener.create
      actors: [end-user]
      summary: Create a short code for a long URL.
    - id: url-shortener.redirect
      actors: [visitor]
      summary: Resolve a short code to its original URL.
  actors:
    - id: visitor
      summary: Anonymous HTTP client opening a short link.
  rules:
    - id: url-shortener.allowed-schemes
      value: [http, https]
    - id: url-shortener.code-length
      value: 7
  budgets:
    - id: url-shortener.redirect.latency-p95
      value: 150ms
      scope: monthly
    - id: url-shortener.availability
      value: 99.9
      unit: percent
      scope: monthly
modifies: []
removes: []
supersedes: []
# -------------------------------------------------------------------------
```
````

---

## Filling guidance

- **Keep the human-readable section conversational.** It's for humans reading the repo a year
  from now. Prefer prose over bullet soup where it's clearer.
- **The `deltas:` block is a contract**, not prose. Every capability / actor / rule / budget
  named here lands in `.devflow/state.yml` on acceptance. Typos here create drift.
- **Every acceptance criterion should have a matching functional requirement**, but not the
  reverse — it's fine to have a functional requirement that's covered by multiple criteria.
- **If `supersedes:` is non-empty**, the *Supersedes* section must list what changes and why.
  The dry-run will enforce that superseded REQs are referenced coherently (see
  [`supersede-protocol.md`](supersede-protocol.md)).
- **IDs, slugs, and actors must be kebab-case, stable, and namespaced** (`url-shortener.create`
  not `create`). Once accepted these become part of the public contract.
