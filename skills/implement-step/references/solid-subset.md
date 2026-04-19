# SOLID subset — SRP, OCP, DIP

`implement-step` enforces three of the five SOLID principles: Single Responsibility,
Open/Closed, and Dependency Inversion. The other two (Liskov, Interface Segregation)
are useful but rarely contentious in feature-sized work; treat them as advisory.

## Single Responsibility (SRP)

**Definition:** a module / class / function has exactly one reason to change.

### Prompts to apply it

- "What is the one thing this function does?" If the answer contains "and", split.
- "If requirement X changes, does this module change? If requirement Y changes, does
  it also change?" If yes to both, split along requirement boundaries.
- "Can I describe the module's job in a single sentence without listing subtasks?" If
  not, split.

### Smells that indicate SRP violation

- A class named with a generic noun (`Manager`, `Handler`, `Processor`, `Service`)
  that does five things.
- A function longer than your repo's conventional length budget (often ~40 lines).
- A change to one concern keeps re-touching the same file with unrelated diffs.
- Tests for the module are arranged in unrelated clusters (`describe('validation')`,
  `describe('persistence')`, `describe('rendering')` all in one file).

### Concrete example

Before (SRP violated):

```ts
class ShortenerService {
  create(url: string): string {
    if (!/^https?:\/\//.test(url)) throw new Error('invalid_url');
    const code = Array.from({length: 7}, () => base62[Math.floor(Math.random() * 62)]).join('');
    db.insert({code, url, createdAt: new Date()});
    logger.info({event: 'shorten.create', code, url});
    return code;
  }
}
```

Four responsibilities: validation, code generation, persistence, logging.

After (SRP applied):

```ts
class ShortenerService {
  constructor(
    private readonly validator: UrlValidator,
    private readonly codes: CodeGenerator,
    private readonly store: Store,
    private readonly log: Logger,
  ) {}

  create(url: string): string {
    this.validator.assertValid(url);
    const code = this.codes.next();
    this.store.put({code, url, createdAt: new Date()});
    this.log.info({event: 'shorten.create', code, url});
    return code;
  }
}
```

Each collaborator has one reason to change. `ShortenerService` coordinates; the parts
specialize.

## Open / Closed (OCP)

**Definition:** open for extension, closed for modification. Adding behavior should
mean adding code, not editing existing code.

### Prompts to apply it

- "Where will the next variant live?" If the answer is "another `else if` in this
  function", OCP is violated.
- "Can I add a new <thing> without editing the registry of <things>?" If not, refactor
  to a pattern that allows open extension (Strategy, Factory, Plugin).
- "If I delete this case branch, does the rest still type-check?" If yes, you're
  probably missing an exhaustiveness check that the type system could enforce.

### Smells that indicate OCP violation

- Growing `switch` / `if-else` chains on a string or enum discriminator.
- A "registry" file that everyone edits for every new feature.
- Variants that differ in behavior but share a scalar type (e.g. different
  `type: 'foo' | 'bar' | 'baz'` strings dispatching unrelated logic).

### Concrete example

Before (OCP violated — adding a scheme edits the function):

```ts
function validate(url: string) {
  const scheme = url.split(':')[0];
  if (scheme === 'http' || scheme === 'https') return;
  if (scheme === 'ftp') throw new Error('invalid_url');
  if (scheme === 'javascript') throw new Error('invalid_url');
  if (scheme === 'data') throw new Error('invalid_url');
  if (scheme === 'file') throw new Error('invalid_url');
  throw new Error('invalid_url');
}
```

After (OCP applied — adding a scheme means adding a list entry):

```ts
const ALLOW = new Set(['http', 'https']);

function validate(url: string) {
  const scheme = url.split(':')[0].toLowerCase();
  if (!ALLOW.has(scheme)) throw new Error('invalid_url');
}
```

Now adding a new allowed scheme is adding a string to the set, not editing a chain.
The function is closed to modification; the policy is open to extension.

## Dependency Inversion (DIP)

**Definition:** high-level modules do not depend on low-level modules. Both depend on
abstractions. Abstractions do not depend on details.

### Prompts to apply it

- "Who defines the interface — the user of the dependency or the provider?" The
  **user** should define it. A well-named port lives with the code that needs it,
  not in an `infrastructure/` bucket.
- "Can I swap the implementation in a test without a mock library?" If you need heavy
  mocking, the abstraction is missing or too broad.
- "If I delete the concrete implementation, does the high-level module still compile?"
  If no (because the high-level module imports the concrete type), DIP is violated.

### Smells that indicate DIP violation

- `import { SqliteStore } from '.../sqlite-store'` inside a domain module.
- Mocking a concrete class with `jest.mock('./db')` instead of injecting a port.
- Tests that require the real filesystem / real HTTP / real database to run unit
  tests.
- A domain module that knows a specific SDK's types.

### Concrete example

Before (DIP violated):

```ts
import { SqliteStore } from '../infrastructure/sqlite-store';

class ShortenerService {
  private store = new SqliteStore();      // domain knows the concrete
  create(url: string): string { ... }
}
```

After (DIP applied):

```ts
// domain/ports/store.ts — the port lives WITH the domain
export interface Store {
  put(entry: {code: string; url: string; createdAt: Date}): void;
  get(code: string): {url: string} | null;
}

// domain/shortener.ts
export class ShortenerService {
  constructor(private readonly store: Store) {}
  create(url: string): string { ... }
}

// infrastructure/sqlite-store.ts — the adapter depends on the port, not vice versa
import type { Store } from '../domain/ports/store';
export class SqliteStore implements Store { ... }
```

Now the domain is testable with an in-memory `Store` and portable across
infrastructure choices.

## Adjacent discipline — rich domain types over primitives and dicts

Not one of the SOLID letters, but enforced alongside them because violations quickly
undo the benefits SRP/OCP/DIP deliver.

**Rule:** when a value has structure, invariants, or domain meaning, represent it as a
named type (class, struct, dataclass, record, `TypedDict`, discriminated union) —
**not** as a bare primitive or an anonymous dict/hash/map.

### Prompts to apply it

- "What does this `string` / `number` actually represent?" If the answer is a domain
  concept (`ShortCode`, `UserId`, `Money`, `Email`), make it a type.
- "Does this dictionary have a fixed shape?" If yes, it's a record — use a class,
  dataclass, interface, struct, or `TypedDict`. Passing `dict[str, Any]` around the
  domain is how invariants get lost.
- "Where do I validate this value?" If the answer is "everywhere it's used", wrap it
  in a type whose constructor enforces the invariant once.

### Smells that indicate the violation

- Functions with multiple `string` / `number` / `bool` parameters where transposition
  would still typecheck (`create(code, url)` vs `create(url, code)`).
- `dict[str, Any]` / `Record<string, unknown>` / `Map<String, Object>` in domain
  signatures.
- Scattered `if not url.startswith("https://"): raise` checks that should live in a
  constructor.
- Test fixtures that build the same shape by hand with slightly different keys each
  time.
- Returning raw ORM rows, HTTP response bodies, or JSON blobs from a repository or
  service.

### Concrete example

Before (primitive obsession):

```python
def create(url: str, user_id: str) -> dict:
    if not url.startswith(("http://", "https://")):
        raise ValueError("invalid_url")
    code = generate_code()
    store.put({"code": code, "url": url, "user_id": user_id})
    return {"code": code, "url": url}
```

Callers juggle `dict`s and bare strings; invariants are re-checked everywhere.

After (rich domain types):

```python
@dataclass(frozen=True)
class Url:
    value: str
    def __post_init__(self):
        if not self.value.startswith(("http://", "https://")):
            raise ValueError("invalid_url")

@dataclass(frozen=True)
class ShortCode:
    value: str
    def __post_init__(self):
        if not re.fullmatch(r"[A-Za-z0-9]{7}", self.value):
            raise ValueError("invalid_code")

@dataclass(frozen=True)
class Shortening:
    code: ShortCode
    url: Url
    created_by: UserId

def create(url: Url, user_id: UserId) -> Shortening:
    entry = Shortening(code=ShortCode(generate_code()), url=url, created_by=user_id)
    store.put(entry)
    return entry
```

Now:

- Invariants live in the type's constructor; checked once.
- Transposition (`create(user_id, url)`) is a type error.
- The return value carries domain meaning, not an anonymous shape.
- Serialization for the HTTP layer is a boundary concern — converted once when
  crossing the port, not scattered through the domain.

### Language-specific notes

| Language | Prefer | Avoid |
|---|---|---|
| TypeScript | `interface` / `type` / branded types for value objects | `Record<string, unknown>`, `any` in domain |
| Python | `@dataclass(frozen=True)`, `pydantic.BaseModel`, `TypedDict` for structural-only shapes | bare `dict[str, Any]` in domain |
| Go | named `struct` types with constructors (`NewX`) | `map[string]interface{}` in domain |
| Rust | `struct` + `impl`; newtype wrappers for primitives | `HashMap<String, Value>` in domain |
| Java/Kotlin | `record` (Java) / `data class` (Kotlin); value types for ids | `Map<String, Object>` in domain |
| Ruby | `Data.define(...)`, `Dry::Struct`, or plain value classes | raw `Hash` flowing through the domain |

### When dicts/hashes are fine

- At the I/O boundary (JSON parsing, ORM serialization) for exactly one hop. Convert
  to a domain type immediately on the inside of the boundary.
- For genuinely heterogeneous structural data (e.g. feature flags keyed by string,
  user-supplied metadata). When the schema is "whatever the caller chose", a dict is
  the correct representation.
- As an implementation detail inside a single function when it never crosses a module
  boundary.

The rule is about **signatures and boundaries**, not local variables.

## When in doubt

Start with the **simplest thing that works** — don't introduce ports for a single
concrete implementation used exactly once. Add abstractions at the **second** use, not
the first. YAGNI beats theoretical purity. The SOLID subset catches code that has
already grown to demand it.

Rich domain types are the exception: introduce them at the **first** use whenever the
value crosses a module boundary or carries a non-trivial invariant. They're cheap,
compound well, and the cost of retrofitting them later is much higher than the cost of
introducing them up front.
