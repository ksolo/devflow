# Mermaid patterns

A small library of Mermaid diagrams to copy into plans, decisions, and requirements.

Rules of engagement:

- **No spaces in node ids.** Use camelCase, PascalCase, or underscores.
- **Quote node labels** with parentheses, brackets, colons, or commas.
- **No explicit colors.** Let the renderer apply theme colors (dark-mode safe).
- **Avoid reserved words** as node ids (`end`, `subgraph`, `graph`, `flowchart`).
- **Click events are disabled.** Don't use `click` syntax.

Source of truth for syntax: [Mermaid docs](https://mermaid.js.org/).

## Architecture (flowchart LR)

For showing component boundaries and dependency direction. Use Left-to-Right for a request
path; Top-to-Bottom for a layered architecture.

```mermaid
flowchart LR
    client["HTTP client"] --> api["API layer"]
    api --> svc["ShortenerService<br/>(SRP)"]
    svc --> store["Store (interface)<br/>(DIP)"]
    store --> inmem["InMemoryStore"]
    store --> sqlite["SqliteStore"]
```

## Sequence (request with multiple actors)

For showing the order of interactions between components or services.

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Service
    participant Store
    Client->>API: POST /shorten {url}
    API->>Service: create(url)
    Service->>Service: validate scheme
    Service->>Service: generate code
    Service->>Store: put(code, url)
    Store-->>Service: ok
    Service-->>API: {code}
    API-->>Client: 201 {code}
```

## State transitions

For lifecycles: `@status` progression, order states, subscription states, entity
lifecycles.

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> accepted: dry-run passes
    draft --> rejected: engineer rejects
    draft --> draft: amend and re-run
    accepted --> superseded: later REQ supersedes
    rejected --> [*]
    superseded --> [*]
```

## Decision trees

For showing which branch is taken based on conditions.

```mermaid
flowchart TD
    start["incoming URL"] --> valid{"scheme in [http, https]?"}
    valid -- no --> reject["400 invalid_url"]
    valid -- yes --> collision{"code collision?"}
    collision -- yes --> retry{"retry count < 5?"}
    retry -- yes --> collision
    retry -- no --> busy["503 Retry-After: 1"]
    collision -- no --> created["201 {code}"]
```

## ER (entity-relationship)

For data models.

```mermaid
erDiagram
    SHORT_CODE ||--o{ REDIRECT_EVENT : receives
    SHORT_CODE {
        string code PK
        string long_url
        datetime created_at
    }
    REDIRECT_EVENT {
        bigint id PK
        string code FK
        datetime occurred_at
        int latency_ms
    }
```

## Pipeline / dependency graph

For plan steps with dependencies, CI pipelines, data pipelines.

```mermaid
flowchart LR
    s1["Step 1<br/>Scaffold"] --> s2["Step 2<br/>Store port"]
    s2 --> s3["Step 3<br/>Create (happy)"]
    s3 --> s4["Step 4<br/>Validation"]
    s3 --> s5["Step 5<br/>Redirect"]
    s5 --> s6["Step 6<br/>SQLite"]
    s6 --> s7["Step 7<br/>Perf + obs"]
```

## C4 container view (system context)

For wider architecture discussions spanning multiple services or external systems.

```mermaid
flowchart TB
    subgraph external [External systems]
        browser["Browser / cURL"]
        cdn["CDN"]
    end
    subgraph system [url-shortener system]
        api["api (node/fastify)"]
        db[("sqlite")]
    end
    browser --> cdn --> api --> db
```

## Gantt-style step timing (optional)

Use sparingly — plans are commit-sized, so hard timing usually isn't meaningful. Keep for
when the engineer explicitly asks to estimate.

```mermaid
gantt
    title url-shortener plan (tentative)
    dateFormat YYYY-MM-DD
    section Infra
    Scaffold           :s1, 2026-04-17, 1d
    Store port         :s2, after s1, 1d
    section Feature
    Create (happy)     :s3, after s2, 1d
    Validation         :s4, after s3, 1d
    Redirect           :s5, after s4, 1d
    section Hardening
    SQLite             :s6, after s5, 1d
    Perf + obs         :s7, after s6, 1d
```

## Choosing a diagram

| When | Use |
|---|---|
| Components / dependencies with direction | flowchart LR or TB |
| Time-ordered interactions across actors | sequenceDiagram |
| Something transitions between named states | stateDiagram-v2 |
| Condition-driven branching | flowchart TD with diamond nodes |
| Data model | erDiagram |
| Step dependencies / CI pipeline | flowchart LR |
| System context, multiple containers | flowchart with subgraphs (poor-man's C4) |
| Timing estimates (rare) | gantt |

## One diagram per topic

A plan with one good flowchart beats a plan with five mediocre ones. If a diagram would be
clearer as prose, use prose.
