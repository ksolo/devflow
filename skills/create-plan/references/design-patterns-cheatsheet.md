# Design patterns cheatsheet

Before inventing a new pattern, look for one already in the codebase. Re-using an existing
pattern is almost always the right call — it reduces cognitive load and keeps a codebase
coherent.

## Prompts to find existing patterns

Run these against the consumer repo before drafting decisions:

1. **Search for sibling features.** What does `docs/features/*/decisions.md` already say?
   DEC entries are the fastest way to find the rules-of-the-road.
2. **Search for "interface", "port", "adapter", "factory", "strategy" in code.** Existing
   DIP boundaries are usually named after the pattern.
3. **Look at `src/` top-level directories.** Is the repo layered (`api/`, `service/`,
   `store/`), vertical-sliced (`features/<slug>/`), or domain-driven (`<domain>/`)? Match the
   existing shape.
4. **Look at test layout.** Does it mirror `src/`? Use the same mirror.
5. **Read `AGENTS.md` / `CLAUDE.md` / `CONTRIBUTING.md`.** Conventions are often declared
   there.

Record what you find in `decisions.md` even when you're **reusing** a pattern — future
agents need to know the decision was intentional, not accidental.

## SOLID subset (enforced in Phase 3)

`devflow` specifically calls out three of the five SOLID principles. Phase 3
(`implement-step`) leans on these; Phase 2 should plan around them.

### SRP — Single Responsibility

A class / module / function should have one reason to change.

Signals of violation:

- The class name requires "and" to describe it (`ShortenerServiceAndLogger`).
- Tests for the class cover unrelated concerns.
- Two engineers edit it for unrelated reasons in the same week.

Resolution: extract. `ShortenerService` does code generation and validation. Logging is a
separate concern (middleware or a decorator) — don't fold it in.

### OCP — Open/Closed

Open to extension, closed to modification. Add behavior without editing existing working
code.

Signals of violation:

- A new feature requires adding `if (type === 'x')` branches to an existing class.
- Every new rule requires editing the same validator.

Resolution: strategy pattern (a registry of rules/handlers keyed by type) or composition (a
chain/list of validators).

### DIP — Dependency Inversion

Depend on abstractions, not concretions. High-level policy doesn't import low-level detail.

Signals of violation:

- `ShortenerService` imports `SqliteClient` directly.
- Unit-testing the service requires a real database.
- Swapping the store means editing the service.

Resolution: a `Store` interface; the service depends on the interface; concrete stores are
injected.

## Common patterns (not exhaustive)

### Port / Adapter (Hexagonal)

- **Port:** an interface defined by the domain (`Store`, `Notifier`, `Clock`).
- **Adapter:** a concrete implementation binding the port to a library/service
  (`SqliteStore`, `SlackNotifier`, `SystemClock`).
- Tests use in-memory/fake adapters.

### Repository

A port named `Repository<T>` with CRUD-ish methods (`get`, `put`, `list`, `delete`). Often
the first port in a codebase. Don't hand-roll more than one variant; pick a single signature
shape.

### Strategy

A registry of interchangeable handlers keyed by input type. Useful for the OCP violations
above.

```ts
type Validator = (input: string) => ValidationResult
const validators: Record<string, Validator> = {
  url: validateUrl,
  email: validateEmail,
}
```

### Decorator / Middleware

Wrap a function to add cross-cutting concerns (logging, retry, auth, rate-limit) without
touching it. Most HTTP frameworks provide middleware primitives — use them.

### Factory

Hide construction complexity behind a function. Useful when a legitimate object needs
several collaborators. Don't use it to hide unresolved design decisions.

### Value object

Small immutable types representing a concept (`ShortCode`, `UserId`, `Money`). Prefer over
`string` / `number` when the value has structure or invariants.

### Result / Either

Return `{ok, value} | {ok: false, error}` (or a Result monad) instead of throwing for
expected failure paths (invalid input, not found). Reserve exceptions for programmer
errors.

## Anti-patterns to watch for

- **God object** (violates SRP).
- **Shotgun surgery** (a change touching many classes — usually points at a missing
  abstraction).
- **Singletons with global mutable state.** If global, at least behind an interface so it
  can be replaced in tests.
- **Leaky abstractions.** Returning DB rows from a repository instead of domain objects.
- **Primitive obsession / anonymous dicts.** Passing `string` / `number` / `dict[str,
  Any]` / `Record<string, unknown>` where a domain concept (`ShortCode`, `Url`,
  `UserId`) belongs. Wrap in a named type with its invariants in the constructor.
- **Premature generality.** Adding extension points before they're needed. YAGNI applies.

## Recording pattern reuse in decisions.md

When reusing a pattern, the DEC entry is short:

```markdown
## DEC-0007 — Use existing Store port for short codes

**Status:** accepted
**Related:** plan.md step 2

### Context

The `auth` feature already defined a `Store<K,V>` port in DEC-0003 with SqliteStore and
InMemoryStore adapters. The url-shortener needs the same shape.

### Decision

Reuse the existing `Store<K,V>` port. Add a new `ShortCodeStore = Store<string, string>`
typedef for clarity.

### Consequences

- No new interface files.
- One more typedef in `src/store/types.ts`.
- Tests can reuse `InMemoryStore<string, string>`.
```

The reuse entry is just as important as a novel decision — without it, someone will
independently invent a different port in three months.
