# Security review

A first-pass security review covering the classes of issues a coding agent can see
from the diff and the scenarios. Not a replacement for a dedicated security audit,
a pentest, or SAST tooling — a backstop that catches common problems before they
ship.

## How to scope

Enumerate every **attack surface** the feature introduces or modifies:

- HTTP / RPC endpoints (new routes, changed routes, new query / body params).
- CLI commands and flags.
- Queue consumers and webhook receivers.
- File parsers / deserializers (JSON, YAML, XML, Protobuf, CSV).
- Templating surfaces (HTML, email, SQL, shell).
- Any code that reads user input and writes to a privileged sink (DB, filesystem,
  external service, stdout when piped).

For each surface, walk the checklist below. Not every item applies to every
surface — skip irrelevant ones, but *name* the ones skipped in the report so the
reviewer has evidence you considered them.

## Checklist

### Authentication

- Is identity checked where required? Which middleware / decorator enforces it?
- Is there a way to reach this surface unauthenticated (direct route, skipped
  middleware, public static mount)?
- If the surface is intentionally unauthenticated, is that called out in the plan /
  scenarios?

Common findings:

- New route mounted outside the auth-guarded router.
- Auth middleware that returns 200 on misconfiguration instead of failing closed.
- Tokens accepted from multiple sources (header + query + cookie) without clear
  precedence.

Severity: **block** for missing auth where it should exist, or fail-open
configurations. **Warn** for unclear precedence.

### Authorization

- Does the authenticated caller have permission for this resource?
- Row-level where relevant (can user A read user B's short URL? edit it? delete
  it?).
- Is the permission check *before* side effects (DB read, external call) or only
  before the final write?
- Are admin-only paths actually gated on role, not just "logged in"?

Common findings:

- `GET /resource/:id` that doesn't filter by `ownerId`.
- Authz check after an expensive DB lookup — leaks existence via timing.
- Role check like `if (user.role === 'admin')` in the route handler rather than
  centralized.

Severity: **block** for missing/broken authorization. Horizontal privilege
escalation (one user reading another's data) is always block.

### Input validation

- Every field validated for type, length, shape, invariants.
- Validation happens at the boundary (rich domain type at the entry point
  preferred).
- Bounds on arrays / strings / numbers to prevent resource exhaustion.
- Allow-list over deny-list where feasible (e.g. URL schemes).

Common findings:

- `req.body.url` passed through without length check or scheme check.
- `limit` / `offset` query params accepted without upper bounds (DoS via huge
  pages).
- Regex with catastrophic backtracking on user input (ReDoS).

Severity: **block** when missing validation enables injection, DoS, or auth
bypass. **Warn** otherwise.

### Injection

Categorize by sink:

- **SQL / NoSQL.** Parameterized queries only. No string concatenation. ORM calls
  without `.raw()`.
- **Shell.** Avoid `exec` / `spawn({ shell: true })` with interpolated user input.
  Prefer arg-array invocations.
- **HTML.** Escape output by default in templates. No `innerHTML` / `dangerouslySetInnerHTML`
  with unsanitized input.
- **Command injection in worker / job args.** Serialized job payloads that become
  shell commands on execution.
- **Log injection.** Newlines in logged user input can forge log lines.
- **Open redirects.** `res.redirect(req.query.next)` without allow-list.
- **XXE in XML parsers.** External entity expansion disabled.
- **YAML.** `yaml.load` unsafe; `yaml.safeLoad` / `yaml.load(..., { schema: CORE_SCHEMA })`.
- **Pickle / Marshal / native deserialization.** Never on untrusted data.

Severity: **block** every injection finding on user-reachable paths.

### Secrets

- No secrets in source. Search the diff for common shapes: `AKIA`, `SG.`, `xoxb-`,
  `ghp_`, `eyJhbGci...`, long base64 strings assigned to identifiers named
  `*_KEY`, `*_SECRET`, `*_TOKEN`, `*_PASSWORD`.
- No secrets in config committed to the repo.
- No secrets in log output. Redaction at the serializer level.
- No secrets in error messages returned to the client.
- `.env` / `.envrc` / secret files gitignored.

Severity: **block** for any committed secret (and recommend rotation).

### URL / path / redirect handling

First-class for the URL-shortener sample; generally applicable to any surface that
accepts a URL or file path.

- URL schemes allow-listed (`http:`, `https:` only; no `javascript:`, `data:`,
  `file:`, `ftp:` unless the feature requires it).
- Host blocked for internal ranges if the surface will fetch the URL (SSRF).
- Redirects validated against an allow-list.
- File paths validated: no `..`, no absolute paths into privileged directories.
- Canonicalize before checking — `./././/etc/passwd` resolves the same as
  `/etc/passwd`.

Severity: **block** for SSRF, path traversal, open redirect on user-reachable
paths.

### Denial of service

- Rate limits on public / cheap-to-abuse endpoints.
- Bounded payload sizes.
- Timeouts on every external call (HTTP, DB, queue, file).
- Bounded concurrency for background work.
- Regex defused (ReDoS).
- Streaming parsers for large inputs (not "load the whole file into memory").

Severity: **warn** for most DoS findings; **block** if the surface is both public
and unbounded (classic amplification target).

### Dependencies

- Run the repo's existing scanner: `npm audit`, `pip-audit`, `bundle audit`,
  `cargo audit`, `go list -json -m all | nancy`, etc.
- High / critical CVEs in production deps → **warn** (with engineer judgment on
  upgrade). Exception: if the CVE is in a code path the feature newly invokes → **block**.
- New transitive deps: flag supply-chain surprises (typo-squat lookalikes, recent
  publish dates with no history).

Severity: **warn** default; **block** when the CVE is exploitable on a code path
the feature adds.

### Logging and error hygiene

- No PII / secrets in logs.
- No full request / response bodies logged unconditionally.
- Structured fields for auditability (user id, request id, route).
- Error responses to clients don't leak stack traces, SQL fragments, file paths,
  or internal IDs that aren't part of the contract.
- Debug endpoints (`/debug`, `/__meta`, `/healthz` returning full config) gated
  behind env check or removed.

Severity: **warn** for logging hygiene; **block** for debug endpoints exposing
sensitive data.

### Crypto and secrets-adjacent

- No hand-rolled crypto.
- Password hashing uses `argon2` / `bcrypt` / `scrypt` — not SHA-only, not MD5.
- HMAC used for tamper-evident tokens, not raw string comparison.
- Random source for tokens is CSPRNG (`crypto.randomBytes`, `secrets.token_*`,
  `os.urandom`) not `Math.random` / `rand()`.
- Keys and certificates not logged, not in error messages, not in tests.

Severity: **block** for hand-rolled crypto, weak hashing, non-CSPRNG randomness on
security tokens.

## Cross-check against scenarios

For each negative / adversarial scenario in `scenarios.yml` (tag `scheme:negative`,
or descriptions describing rejected input), confirm:

- There's a test in the scenario's `tests:` list that actually exercises the
  rejection.
- The rejection happens before any side effect.
- The rejection message doesn't leak info (e.g. distinguish "user not found" vs
  "wrong password" where it shouldn't).

Missing negative-path coverage for a known attack vector is a **block** finding
(route to `create-plan` to add the scenario, then `implement-step` to cover it).

## Prompts to work through each surface

For every HTTP / CLI / queue / parser surface the feature touches:

1. **Who is allowed to hit this?** (authn)
2. **Which of their resources are they allowed to touch?** (authz)
3. **What is the worst-shaped input a caller could send?** (input validation + DoS)
4. **Where does the input flow to — DB, shell, template, filesystem, external
   service?** (injection)
5. **What does the response reveal about the system?** (info leakage)
6. **What happens under load?** (DoS, rate limit)

If any of these answers is "I don't know", that's a finding — either block
(critical surface) or warn (internal / low-risk surface).

## Output format

Every finding uses the same template from
[`readability-review.md`](readability-review.md) with category starting with
`Security`:

```
- **[Security] <vector> on <surface>**
  - File: <path>:<line>
  - Evidence: <quote of the offending code>
  - Rationale: <which rule this violates and the realistic exploitation path>
  - Resolution: <specific fix; if new scenarios are needed, say so>
  - Severity: block | warn | info
```

## Limits

- The agent cannot run dynamic analysis, fuzz, or pentest. Findings are based on
  static inspection of the diff and scenarios.
- The agent cannot evaluate business-context-dependent risks (e.g. "is this
  endpoint public-facing in production?"). When context is unclear, ask the
  engineer and record the answer in the report.
- This review does not replace dedicated security review for high-risk features
  (payments, auth, file upload, admin tooling). Flag those in the report so the
  engineer knows to book one.
