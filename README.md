# GitHub Rater API

Backend service for ranking GitHub repositories using a configurable popularity score.

## Overview

The service queries a bounded GitHub Search API window, calculates repository popularity, sorts results, and returns paginated API responses.

Primary inputs:
- `language`
- `createdAfter`

Primary score factors:
- stars
- forks
- recency based on `pushed_at`

## Architecture

The project follows a simplified modular monolith / clean layering approach:

```text
API -> Application -> Domain -> Infrastructure
```

- API: controllers, DTO validation, Swagger schema
- Application: orchestration, cache lookup, in-flight deduplication, pagination/response shaping
- Domain: models, interfaces, scoring logic
- Infrastructure: GitHub integration, cache adapters, throttling, technical services

## Setup

Requirements:
- Node.js 22+
- npm

Install:

```bash
npm install
```

Environment:

```bash
cp .env.example .env
```

## Run

Development:

```bash
npm run start:dev
```

Production build:

```bash
npm run build
npm run start:prod
```

Swagger:
- `http://localhost:3000/docs`

Health:
- `GET /health`

## Environment Variables

Core:
- `NODE_ENV` (`development|test|production`)
- `PORT` (default `3000`)
- `SWAGGER_PATH` (default `docs`)

GitHub:
- `GITHUB_TOKEN` (optional)
- `GITHUB_FETCH_PER_PAGE` (default `100`)
- `GITHUB_MAX_FETCH_PAGES` (default `1`)
- `GITHUB_MAX_FETCH_REPOSITORIES` (default `100`)
- `GITHUB_REQUEST_TIMEOUT_MS` (default `5000`)

Scoring:
- `SCORE_STARS_WEIGHT` (default `0.5`)
- `SCORE_FORKS_WEIGHT` (default `0.3`)
- `SCORE_RECENCY_WEIGHT` (default `0.2`)
- `SCORE_RECENCY_DECAY` (default `0.03`)
- `SCORE_FORMULA_VERSION` (default `v1`)

Cache / outbound:
- `CACHE_TTL_SECONDS` (default `300`)
- `OUTBOUND_MAX_CONCURRENT` (default `2`)
- `OUTBOUND_MIN_TIME_MS` (default `300`)

Logging:
- `LOG_LEVEL` (default `info`)

## API

Endpoint:

```http
GET /repositories
```

Query:
- `language?: string`
- `createdAfter?: string` (ISO date)
- `page?: number` (default `1`)
- `limit?: number` (default `20`, max `100`)

Response:

```json
{
  "items": [
    {
      "id": 1,
      "name": "repo",
      "fullName": "org/repo",
      "url": "https://github.com/org/repo",
      "language": "TypeScript",
      "stars": 100,
      "forks": 20,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-02T00:00:00.000Z",
      "pushedAt": "2024-01-03T00:00:00.000Z",
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

## Scoring

Version:

```ts
scoreFormulaVersion = "v1"
```

Formula:

```ts
starsComponent = log(stars + 1) * starsWeight
forksComponent = log(forks + 1) * forksWeight
recencyComponent = exp(-recencyDecay * daysSinceLastPush) * recencyWeight
popularityScore = starsComponent + forksComponent + recencyComponent
```

Recency uses `pushed_at`.

## Caching Strategy

Current primary cache layer stores fully processed ordered repository lists (not paginated slices).

Base cache key includes:
- `language`
- `createdAfter`
- `scoreFormulaVersion`

Flow:
1. Resolve base cache key
2. Cache hit -> use processed ordered list
3. Cache miss -> fetch GitHub window, score/sort once, cache processed list
4. Apply `page/limit` in memory per request

Trade-off:
- Higher cache memory usage per key
- Much lower repeated upstream + scoring cost when only `page/limit` changes

## GitHub Integration

- Endpoint: `GET https://api.github.com/search/repositories`
- Query uses `language:{language}` and `created:>{createdAfter}`
- Optional auth via `GITHUB_TOKEN`
- Outbound throttling via Bottleneck
- Timeouts and upstream error mapping (`429`/`503`)

## Observability

Implemented pragmatic observability:
- Structured JSON logging via a unified logger service (`winston` backend)
- Consistent log contexts via enum-based contexts
- Request correlation ID (`x-request-id`) generation/propagation
- Request start/finish logs
- Cache hit/miss logs
- External API call start/finish/error logs
- Upstream error classification logs

Metrics-ready instrumentation points:
- total requests
- errors
- request duration
- external API latency
- cache hits/misses

Current metrics are in-process instrumentation hooks, ready to be exported to Prometheus-compatible endpoints later.

## Testing

Unit tests:

```bash
npm test -- --runInBand
```

Mocked e2e:

```bash
npm run test:e2e
```

Live e2e (real GitHub, opt-in):

```bash
RUN_LIVE_GITHUB_TESTS=true GITHUB_TOKEN=your_token npm run test:e2e:live
```

Load tests:

```bash
npm run test:load
npm run test:load:100
npm run test:load:100:nocache
```

`test:load:100:nocache` uses unique valid query values per request to reduce cache reuse and stress the expensive path more realistically.

## Docker

With docker compose:

```bash
docker compose up --build
```

Compose uses a named volume:
- `github-rater-data` mounted at `/app/data`

Stop compose stack:

```bash
docker compose down
```

Direct docker build:

```bash
docker build -t github-rater .
```

Direct docker run:

```bash
docker run --rm -p 3000:3000 --env-file .env github-rater
```

## Assumptions

- The service ranks a bounded GitHub Search API window, not the full GitHub dataset
- Single language filter per request
- No database in current version
- GitHub is the main bottleneck
- In-memory cache is the active adapter
- `scoreFormulaVersion` participates in cache keying

## Trade-offs

- Chosen bounded fetch window keeps latency predictable but can omit repositories outside the configured window
- In-memory cache is simple and fast but per-instance only
- Lightweight observability avoids complexity but does not yet expose full Prometheus/trace pipelines

## Future Scalability

- Redis cache adapter behind `QueryCache`
- Shared cache across instances
- API-level rate limiting
- Wider fetch windows via configuration
- Background refresh/prefetch
- Persistent storage for snapshots
- External metrics/tracing (Prometheus/Grafana, OpenTelemetry)

## CI/CD

GitHub Actions workflows:
- `CI` (`.github/workflows/ci.yml`)
  - install
  - build
  - unit tests
  - mocked e2e tests
- `CD` (`.github/workflows/cd.yml`)
  - build Docker image on `main`
  - push image to GHCR:
    - `ghcr.io/<owner>/github-rater:latest`
    - `ghcr.io/<owner>/github-rater:sha-...`
