# Architecture

## Context

The objective is to implement a backend application (using NestJS) for scoring GitHub repositories.

GitHub provides a public search endpoint for fetching repositories.

The user should be able to configure:

- earliest created date
- language

---

## Task

Develop a scoring algorithm that assigns a popularity score to each repository.

Factors:

- stars
- forks
- recency of updates

---

## Core Principles

- Keep the solution concise and clean
- Focus on clarity over completeness
- Demonstrate scalability awareness without overengineering
- Prefer strong trade-offs over unnecessary complexity
- Design for realistic evolution, not hypothetical scale
- Basic logging and observability of internal processes

---

## Critical Design Decisions

- The system operates on a **bounded subset of GitHub search results**
- GitHub is treated as an **external bottleneck**
- The system prioritizes **predictable latency and controlled upstream usage**
- No database is used in this version
- Basic structured logging is included for request flow, cache usage, outbound GitHub calls, and error handling
- No queues, background jobs, or distributed systems are introduced
- `pushed_at` is used as the recency signal
- `scoreFormulaVersion = "v1"` is introduced and included in cache keys

---

## Bounded Fetch Strategy

The service fetches a **limited GitHub Search API result window per request**.

This window is controlled via configuration:

```text
GITHUB_FETCH_PER_PAGE=100
GITHUB_MAX_FETCH_PAGES=1
GITHUB_MAX_FETCH_REPOSITORIES=100
```

### Notes

- GitHub pagination is **internal only**
- The system does **not traverse the full GitHub dataset**
- The system fetches only a bounded number of GitHub result pages and repositories
- This keeps latency predictable and avoids excessive upstream usage

---

## Public API

### Endpoint

```http
GET /repositories
```

### Query Params

- `language?: string`
- `createdAfter?: string` (ISO date)
- `page?: number = 1`
- `limit?: number = 20` (max 100)

---

## Pagination Model

The system uses **two different pagination concerns**:

### Internal GitHub Pagination

Used only to fetch a bounded result window from GitHub.

Controlled by:

```text
GITHUB_FETCH_PER_PAGE
GITHUB_MAX_FETCH_PAGES
GITHUB_MAX_FETCH_REPOSITORIES
```

### External API Pagination

Applied **after scoring**, over the bounded in-memory result set fetched for the request.

This means:

- clients can use `page` and `limit`
- pagination is applied only over the fetched bounded dataset
- the service does **not** paginate across the full GitHub search space

---

## Response Shape

```json
{
  "items": [
    {
      "id": 1,
      "name": "nest",
      "fullName": "nestjs/nest",
      "url": "https://github.com/nestjs/nest",
      "language": "TypeScript",
      "stars": 1000,
      "forks": 120,
      "createdAt": "...",
      "updatedAt": "...",
      "pushedAt": "...",
      "popularityScore": 3.42,
      "scoreBreakdown": {
        "stars": 2.1,
        "forks": 0.8,
        "recency": 0.52
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "scoreFormulaVersion": "v1"
  }
}
```

---

## Scoring Algorithm

### Version

```ts
scoreFormulaVersion = "v1";
```

### Formula

For each repository:

```ts
starsComponent = log(stars + 1) * starsWeight;
forksComponent = log(forks + 1) * forksWeight;
recencyComponent = exp(-recencyDecay * daysSinceLastPush) * recencyWeight;

popularityScore = starsComponent + forksComponent + recencyComponent;
```

### Defaults

```text
starsWeight = 0.5
forksWeight = 0.3
recencyWeight = 0.2
recencyDecay = 0.03
```

### Notes

- `pushed_at` is used instead of `updated_at`
- logarithmic scaling reduces the dominance of outliers
- exponential decay gives smooth freshness degradation
- return both `popularityScore` and `scoreBreakdown`
- scoring weights are configurable through environment variables

---

## Architecture Style

The system follows a simplified **Clean Architecture / modular monolith** approach:

```text
API → Application → Domain → Infrastructure
```

### API Layer

Responsible for:

- HTTP controllers
- DTOs
- request validation
- response formatting
- Swagger documentation

### Application Layer

Responsible for:

- use case orchestration
- cache lookup
- deduplication flow
- provider invocation
- scoring orchestration
- sorting and pagination
- response shaping

### Domain Layer

Responsible for:

- domain models
- business interfaces
- scoring rules

This layer must remain independent from NestJS framework concerns and infrastructure details.

### Infrastructure Layer

Responsible for:

- GitHub API integration
- outbound throttling
- response mapping
- cache implementation
- technical support services

---

## Required Abstractions

### GithubRepositoryProvider

Encapsulates access to GitHub Search API.

Purpose:

- isolate external API concerns
- avoid leaking HTTP and provider-specific logic into the application layer
- keep the use case independent from GitHub query construction

### QueryCache

Abstract cache interface:

```ts
get<T>(key: string): Promise<T | null>
set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
```

Requirements:

- application layer depends only on this abstraction
- current implementation uses in-memory TTL cache
- design must allow replacing it later with Redis through NestJS DI
- no application logic should change when swapping cache adapters

### RepositoryScoringService

Encapsulates the scoring formula.

Purpose:

- isolate business logic
- keep scoring testable
- support future score evolution via `scoreFormulaVersion`

---

## Supporting Components

### CacheKeyFactory

Responsible for generating deterministic cache keys.

The cache key must include:

- language
- createdAfter
- page
- limit
- scoreFormulaVersion

Example:

```text
repos:language=typescript:createdAfter=2024-01-01:page=1:limit=20:score=v1
```

### InFlightRequestsRegistry

Responsible for deduplicating identical concurrent requests.

Suggested internal structure:

```ts
Map<string, Promise<RepositoriesResponse>>;
```

Purpose:

- prevent duplicate GitHub requests
- reduce unnecessary upstream pressure
- avoid local request stampede for identical queries

---

## High-Level Request Flow

1. `GET /repositories` receives query params
2. Validate and normalize input
3. Build cache key using filters, pagination, and `scoreFormulaVersion`
4. Check cache
5. If cache hit → return cached response
6. If cache miss:
   - use in-flight deduplication for identical keys
   - fetch bounded result window from GitHub through throttled outbound client
   - map GitHub API response into domain models
   - compute `popularityScore` and `scoreBreakdown`
   - sort repositories by `popularityScore` descending
   - apply API pagination over the bounded scored dataset
   - save final response to cache
7. Return response

---

## GitHub Integration

### Endpoint

```http
GET https://api.github.com/search/repositories
```

### Query Construction

Build `q` using:

- `language:{language}`
- `created:>{createdAfter}`

### Authentication

- `GITHUB_TOKEN` is optional
- support both authenticated and unauthenticated modes

### Outbound Throttling

Use Bottleneck in the GitHub client/provider layer.

Suggested defaults:

```text
maxConcurrent=2
minTime=300
```

Purpose:

- smooth outbound traffic
- reduce burst pressure on GitHub
- improve resilience against rate limits

---

## Cache Strategy

### Current Implementation

- in-memory TTL cache

### Design Requirement

Cache must be abstracted behind a shared interface.

An in-memory implementation is required for this version.

The design should allow a Redis adapter to be added later via NestJS dependency injection without changing application logic.

The design should allow easy integration with monitoring tools such as Prometheus and Grafana.

### Cache Lifecycle

- check cache before any outbound call
- cache final shaped API response
- use TTL-based expiration

---

## Resilience Requirements

The implementation must include basic resilience measures for outbound GitHub calls.

### Timeouts

- All outbound requests to GitHub must use a reasonable timeout
- The service must avoid hanging requests when GitHub is slow or unresponsive

### Error Handling

- Validation errors must return `400`
- GitHub rate-limit related failures should be mapped to `429` or `503` with a clear message
- Other upstream GitHub failures should return `503`
- Error responses should remain clean, predictable, and useful

### Failure Behavior

- The service should fail fast on upstream errors
- Resilience mechanisms must remain pragmatic and simple
- Do not introduce retries, circuit breakers, queues, or other heavy resilience patterns in this version

---

## Validation

Use `class-validator` and a global `ValidationPipe` with:

```ts
whitelist: true;
forbidNonWhitelisted: true;
transform: true;
```

---

## Security and Configuration Hygiene

- keep all configuration environment-driven
- never hardcode tokens or secrets
- provide `.env.example` with safe placeholders only
- ignore local environment files and build artifacts

---

## Testing Strategy

### Unit Tests

#### Scoring service

Cover:

- score increases with stars
- score increases with forks
- fresher `pushedAt` gives higher recency contribution
- `scoreBreakdown` is returned correctly
- `scoreFormulaVersion` is stable and exposed where required

#### Cache key factory

Cover:

- key includes filters and pagination
- key changes when `scoreFormulaVersion` changes

### E2E Test

Cover:

- successful `GET /repositories` flow with mocked GitHub dependency
- validation error path

---

## Documentation Requirements

### Swagger

Swagger documentation is required.

Document:

- endpoint
- query parameters
- response schema

### README

The README should include:

- project overview
- architecture summary
- setup and run instructions
- environment variables
- endpoint description
- scoring formula
- `scoreFormulaVersion`
- caching strategy
- outbound throttling
- assumptions and trade-offs
- test instructions
- Docker usage
- future scalability directions
- observability and possible integration with Prometheus and Grafana

---

## Assumptions

- The service ranks only a bounded GitHub Search API result window
- Only one language filter is supported per request
- `pushed_at` is used as recency
- No database is used in this version
- GitHub is the primary system bottleneck
- Cache is abstracted behind a shared interface
- In-memory cache is the only implementation required in this version
- `scoreFormulaVersion` is included in cache keys to keep cache reuse safe across formula changes

---

## Future Scalability Directions

This version intentionally keeps infrastructure minimal, but leaves clear extension points.

Possible next steps:

- replace in-memory cache with Redis without changing application logic
- use Redis as shared cache across multiple instances
- add API-level rate limiting
- widen the bounded fetch window through configuration
- introduce background refresh or prefetch jobs
- persist repository snapshots in PostgreSQL
- add metrics, tracing, and external monitoring integration (e.g. Prometheus and Grafana)
- evolve scoring logic while preserving cache correctness through `scoreFormulaVersion`

---

## Suggested Project Structure

```text
src/
  main.ts
  app.module.ts
  common/
    config/
      configuration.ts
      env.validation.ts
    constants/
      tokens.ts
  modules/
    repositories/
      api/
        repositories.controller.ts
        dto/
          get-repositories.query.dto.ts
          repository-response.dto.ts
      application/
        use-cases/
          search-and-score-repositories.use-case.ts
      domain/
        interfaces/
          github-repository.provider.ts
          query-cache.interface.ts
        services/
          repository-scoring.service.ts
        models/
          repository.model.ts
          scored-repository.model.ts
          repository-score-breakdown.model.ts
      infrastructure/
        github/
          github.client.ts
          github.repository.provider.ts
          github.mapper.ts
        cache/
          in-memory-query-cache.service.ts
          cache-key.factory.ts
          in-flight-requests.registry.ts
          cache.provider.ts
      repositories.module.ts
    health/
      health.controller.ts
```

---

## Implementation Plan

### Commit 1 — bootstrap project foundation

- Create NestJS project structure
- Add configuration module
- Add env validation
- Add Swagger bootstrap
- Add global ValidationPipe
- Add health endpoint
- Add secure `.gitignore`
- Add `.env.example` with placeholders only
- Keep startup clean and production-oriented

### Commit 2 — define domain models and contracts

- Add repository domain models
- Add scored repository model
- Add score breakdown model
- Add interfaces:
  - `GithubRepositoryProvider`
  - `QueryCache`
- Add `scoreFormulaVersion = "v1"`
- Keep domain free from NestJS and infrastructure details

### Commit 3 — implement scoring logic

- Add `RepositoryScoringService`
- Implement normalized formula with configurable weights
- Use `pushed_at` for recency
- Return `popularityScore` and `scoreBreakdown`
- Use and expose `scoreFormulaVersion` where needed
- Add focused unit tests for scoring

### Commit 4 — implement GitHub infrastructure

- Add `GithubClient` using Nest `HttpModule` / axios
- Add outbound throttling via Bottleneck
- Add mapper from GitHub API response to domain model
- Add `GithubRepositoryProvider` implementation
- Support optional `GITHUB_TOKEN`
- Keep GitHub-specific logic isolated in infrastructure

### Commit 5 — implement cache infrastructure

- Add `QueryCache` implementation:
  - `InMemoryQueryCache`
- Add `CacheKeyFactory`
- Include `scoreFormulaVersion` in cache key
- Add `InFlightRequestsRegistry` for request deduplication
- Add NestJS cache provider/token wiring so the cache can be replaced later without changing application logic
- Keep these generic and small
- Add tests where useful

### Commit 6 — implement application use case

- Add `SearchAndScoreRepositoriesUseCase`
- Orchestrate:
  - cache lookup
  - in-flight deduplication
  - GitHub fetch
  - scoring
  - sorting
  - response shaping
  - cache save
- Keep application logic readable and minimal
- Do not leak infrastructure concerns into controller

### Commit 7 — implement API layer

- Add `GET /repositories` endpoint
- Add query DTO with validation
- Add response DTOs if useful
- Wire controller to use case
- Return clean response contract
- Support page and limit parameters
- Include `scoreFormulaVersion` in response meta
- Keep endpoint concise

### Commit 8 — error handling and resilience polish

- Add clean upstream error mapping
- Handle GitHub failures predictably
- Ensure throttling and cache do not complicate API layer
- Keep resilience pragmatic, not overengineered

### Commit 9 — containerization

- Add multi-stage Dockerfile
- Add `.dockerignore`
- Ensure production startup works in container
- Keep container setup simple, secure, and review-friendly

### Commit 10 — e2e tests

- Add e2e tests for `GET /repositories`
- Mock external GitHub dependency
- Cover success path
- Cover invalid query path

### Commit 11 — documentation and final polish

- Write concise README
- Document architecture, assumptions, trade-offs, score formula, `scoreFormulaVersion`, throttling, and cache strategy
- Add Docker instructions
- Add future scalability section
- Ensure code is easy to review
- Keep final solution production-leaning, concise, and clean

---

## Final Goal

Deliver a solution that is:

- simple but well-structured
- easy to explain in a follow-up interview
- aware of real-world constraints
- prepared for future scaling without premature complexity
