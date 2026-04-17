# Decisions template (ADR-lite)

One `decisions.md` per feature. Each decision is a short block with its own `DEC-NNNN` id.
Keep each entry to ~1 page. If you need more, link out.

Decision IDs are **global across features** (like REQ ids), so you can reference
`DEC-0017` from any feature or scenario.

---

````markdown
---
feature: url-shortener
last_updated: 2026-04-16T17:10:00Z
---

# Decisions — url-shortener

## DEC-0001 — Runtime and language

**Status:** accepted (2026-04-16)
**Related:** plan.md step 1; REQ-0042 non-functional (perf)

### Context

We need a small HTTP service with low p95 latency (<150ms) and simple operational story.
The team is comfortable with both Node and Python. No existing service to match.

### Options considered

1. **Node + Fastify** — fast cold start, single-language with the eventual UI, mature
   integration-test ecosystem (vitest + supertest).
2. **Python + FastAPI** — easier data work later, pytest is mature, uvicorn is fast
   enough.
3. **Go + chi** — lowest latency, but adds a language we don't already run elsewhere.

### Decision

**Node + Fastify.** Matches future UI stack, keeps us to one language, and the
integration-test story (vitest + supertest) is straightforward to wire into the
scenarios.yml `tests:` list.

### Consequences

- We lock into the npm toolchain (node_modules footprint, lockfile discipline).
- Perf test tooling will use autocannon.
- If we later need heavy data work, we'll do it in a separate service.

---

## DEC-0002 — Repository layout

**Status:** accepted (2026-04-16)
**Related:** plan.md step 1

### Context

Small service; no existing monorepo convention in this repo.

### Options considered

1. **Flat `src/` + `tests/`** — conventional, low friction.
2. **Layered `src/{api,service,store}/`** — signals boundaries up front.
3. **Vertical-slice `src/features/<slug>/`** — good for growth but overkill for one feature.

### Decision

**Layered `src/{api,service,store}/`** so the DIP boundary between `service` and `store` is
visible on disk from day one.

### Consequences

- Each directory has its own `index.ts` aggregator.
- Tests mirror the layout under `tests/`.

---

## DEC-0003 — Persistence strategy starts in-memory

**Status:** accepted (2026-04-16)
**Related:** plan.md steps 2, 6

### Context

The requirement doesn't specify a database. We need to prove the service works before
committing to a store.

### Options considered

1. **InMemoryStore only** — simplest, but loses data on restart.
2. **SQLite from the start** — durable, but adds setup/migration work before any feature lands.
3. **InMemoryStore first, SQLite in step 6** — proves behavior, then adds durability.

### Decision

**InMemoryStore first, SQLite in step 6.** The `Store` interface (DIP) makes the swap a
drop-in. Behavior scenarios pass against both implementations.

### Consequences

- Restarts between steps 2 and 5 lose data (acceptable during development).
- Step 6 includes a migration script and a config switch.
- Scenarios are run twice in CI post-step-6: once against in-memory, once against SQLite.

---

## DEC-0004 — Base62 7-character short codes

**Status:** accepted (2026-04-16)
**Related:** plan.md step 3; REQ-0042 non-functional (code-length)

### Context

Short codes need to be URL-safe, short enough to be useful, and have a low collision rate.

### Options considered

1. **Base62, 6 chars** — ~56B codes; noticeable collision risk past 50M codes.
2. **Base62, 7 chars** — ~3.5T codes; collision prob < 1e-6 up to 10B codes.
3. **Base58, 8 chars** — Bitcoin-style, avoids visual ambiguity but longer.
4. **UUIDv7 base62-encoded** — overkill.

### Decision

**Base62, 7 characters** (alphabet `[A-Za-z0-9]`).

### Consequences

- Encoded in the REQ-0042 `deltas.rules.url-shortener.code-length = 7` already.
- Collision handling (retry up to 5 times) stays simple.
- Case-sensitive: `ab12Xyz` ≠ `ab12xyz`.
````

---

## Filling guidance

- **One DEC per decision**, even if small. "We chose Fastify over Express" deserves its own
  entry; future agents will search for it.
- **Status values:** `proposed`, `accepted`, `rejected`, `superseded`. A superseded entry
  keeps its id; a newer entry with a higher DEC id takes its place and links back.
- **Link to plan step(s) and REQ id(s).** Helps `review-changes` verify traceability.
- **Don't relitigate.** An accepted decision is final unless explicitly superseded. If the
  plan step needs to revisit, create DEC-N+1 that supersedes the earlier one.
- **Reusing existing patterns** in the codebase is a valid decision — name the pattern and
  cite the prior DEC/feature/commit. See
  [`design-patterns-cheatsheet.md`](design-patterns-cheatsheet.md).
