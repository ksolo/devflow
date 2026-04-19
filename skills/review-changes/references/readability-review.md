# Readability and maintainability review

Work through every file changed in this feature. Use
`git diff --name-only <feature-base>..HEAD` to scope. This is a judgment pass —
findings are tiered as **warn** by default and **block** only when the issue is a
correctness or contract violation, not a style preference.

## Scope

- `src/` and the ecosystem-native code homes.
- `tests/` (yes — tests are code).
- Plan docs only incidentally; plan critique belongs in Phase 2, not Phase 5.

## Categories and what to look for

### SOLID subset (SRP / OCP / DIP)

Cross-reference
[`../../implement-step/references/solid-subset.md`](../../implement-step/references/solid-subset.md).
Look for:

- **SRP violations:** classes named `Manager`/`Handler`/`Processor`/`Service` that
  do multiple unrelated things. Functions > ~40 lines without clear reason.
  Tests arranged in unrelated clusters inside one file.
- **OCP violations:** growing `switch` / `if-else` chains on a discriminator. A
  "registry" file everyone edits for every new case.
- **DIP violations:** domain code importing concrete infrastructure types. Mocks on
  concrete classes where a port should exist.

Severity: usually **warn**. Elevate to **block** when the violation will compound:
e.g. the class is part of a public API, or the `switch` chain is the thing about to
grow across 10 more requirements.

### Rich domain types

Cross-reference the "Adjacent discipline" section of the SOLID reference.

- Bare `string` / `number` parameters for domain concepts (`ShortCode`, `Url`,
  `UserId`).
- `dict[str, Any]` / `Record<string, unknown>` / `Map<String, Object>` in domain
  signatures.
- Scattered validation that should live in a type's constructor.
- Raw ORM rows returned from repositories.

Severity: **warn** for new code; **info** for pre-existing debt; **block** when
the missing type causes a correctness issue visible in the diff (e.g. two
transposable `string` args with no typechecking saving the caller).

### Naming

- Does the name describe what the thing does or just what it is?
  (`createShortCode` ✓ vs `processItem` ✗)
- Are booleans named as predicates (`isValid`, `hasAccess`) rather than state
  (`valid`, `access`)?
- Are types named as nouns, functions/methods as verbs?
- Are abbreviations understood by the whole codebase (not just the author)?
- Is terminology consistent across the feature (don't use `url`, `longUrl`, and
  `original_url` interchangeably)?

Severity: usually **info** or **warn**. **Block** when the name actively misleads
(e.g. a function named `delete` that doesn't delete).

### Complexity

- Function/method length. Threshold is repo-specific (often ~40 lines); if
  `.dev-flow.yml` defines one, use it.
- Nesting depth. More than three levels of nesting is a smell.
- Cyclomatic complexity. Use the repo's linter output if available
  (`eslint-plugin-complexity`, `flake8 C901`, `gocyclo`, etc.).
- Number of parameters. More than 4-5 is a smell — usually points at a missing
  domain type.

Severity: **warn**. **Block** only if the complexity makes a correctness bug hard
to rule out.

### Dead code

- Unused imports, unreferenced exports, commented-out blocks.
- Debug logs / `console.log` / `print` statements left in production paths.
- Feature flags with no consumer.
- Empty catch blocks (often points at a real bug, not just dead code).

Severity: **info** for unused imports; **warn** for commented-out blocks; **block**
for empty catch or swallowed errors.

### Test quality

Tests are reviewed at the same bar as production code.

- **Asserts the right thing.** `expect(spy).toHaveBeenCalled()` alone is usually not
  enough — it proves the function was invoked, not that the behavior is correct.
  Look for what the test actually guarantees.
- **No shared mutable fixtures.** Tests should be order-independent. A test that
  fails when run in isolation is a red flag.
- **Test names match assertions.** `it("creates a user", () => expect(x).toBe(42))`
  is a bug waiting to happen.
- **No test-only code paths in production.** A `if (process.env.NODE_ENV === 'test')`
  branch in `src/` is almost always wrong.
- **Fixtures via factories, not hand-rolled objects.** A test that constructs a
  15-field object by hand is fragile.

Severity: **warn** by default. **Block** when a passing scenario's tests don't
actually prove the scenario's behavior.

### Documentation

- Non-obvious decisions have `DEC-NNNN` entries in `decisions.md`. The code may
  reference them in a comment.
- Public APIs (exported functions, classes) have a one-line doc comment naming
  purpose and ownership of side effects.
- Long functions have a leading comment naming *why*, not *what*.
- No obvious comments that just narrate code (`// increment counter` above
  `counter++`).
- README / CHANGELOG entries produced in `finalize-feature` match what the code
  actually does.

Severity: **info** usually. **Warn** when a non-obvious decision has no DEC or
when a public API is undocumented and the name alone doesn't tell you what it does.

### Error handling

- Errors raised / returned carry enough context to debug.
- No broad `catch (e) {}` that swallows exceptions.
- Boundary failures produce structured results the caller can handle (Result /
  Either pattern where appropriate).
- Programmer errors (assertion failures) are distinct from expected failures
  (invalid input, not found).

Severity: **warn**; **block** when errors are swallowed in ways that can mask bugs
in production.

## Prompts to work through each file

For every changed file, ask:

1. **What is this file's one reason to change?** If you can't answer in a
   sentence, flag SRP.
2. **What would I need to know to modify this tomorrow?** If the answer requires
   reading five other files, flag DIP / cohesion.
3. **Does each name predict what the thing does before I read the body?** If not,
   flag naming.
4. **If a new teammate read this test, would they understand what it proves?** If
   not, flag test quality.
5. **Are there values in signatures that should be types?** If yes, flag domain
   types.

## When to block vs warn

| Finding | Block | Warn | Info |
|---|---|---|---|
| SRP violation on a public API class | ✓ | | |
| SRP violation on an internal helper | | ✓ | |
| OCP violation with one case | | | ✓ |
| OCP violation with four cases and the 5th coming | | ✓ | |
| OCP violation already causing a correctness bug | ✓ | | |
| DIP: domain imports concrete infra | | ✓ | |
| DIP: test needs real DB to run unit tests | | ✓ | |
| Bare string for domain concept, new code | | ✓ | |
| Bare string for domain concept, existing code | | | ✓ |
| Misleading name (semantic mismatch) | ✓ | | |
| Awkward name (readable but could be better) | | | ✓ |
| Function > threshold | | ✓ | |
| Unused import | | | ✓ |
| Swallowed exception | ✓ | | |
| Test name doesn't match assertion | ✓ | | |
| Test passes but asserts nothing meaningful | ✓ | | |
| Missing DEC for non-obvious decision | | ✓ | |
| Missing doc on public API | | ✓ | |

When in doubt, **warn**. Block is reserved for real impact.

## What NOT to flag

- Personal style preferences (tabs vs spaces, brace style, quote style). That's the
  linter's job.
- Naming choices the reviewer would have made differently but the repo's convention
  accepts.
- Patterns the repo has chosen (e.g. "we don't use exceptions here") — work with the
  convention, not against it.
- Anything the engineer has explicitly deferred via a `deferred:` tag on a scenario
  or a `FIXME(REQ-NNNN)` comment referencing an accepted follow-up.

## Output

Every finding feeds into the review report per
[`review-report.md`](review-report.md). The finding format is:

```
- **[<Category>] <one-line title>**
  - File: <path>:<line>[-<line>]
  - Evidence: <short quote of the offending code or pattern>
  - Rationale: <why this is a finding, referencing the relevant discipline>
  - Resolution: <specific fix or route to an earlier phase>
  - Severity: block | warn | info
```
