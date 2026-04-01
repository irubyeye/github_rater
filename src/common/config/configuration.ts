export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    swaggerPath: process.env.SWAGGER_PATH ?? 'docs'
  },
  github: {
    token: process.env.GITHUB_TOKEN ?? '',
    fetchPerPage: Number(process.env.GITHUB_FETCH_PER_PAGE ?? 100),
    maxFetchPages: Number(process.env.GITHUB_MAX_FETCH_PAGES ?? 1),
    maxFetchRepositories: Number(process.env.GITHUB_MAX_FETCH_REPOSITORIES ?? 100),
    requestTimeoutMs: Number(process.env.GITHUB_REQUEST_TIMEOUT_MS ?? 5000)
  },
  scoring: {
    starsWeight: Number(process.env.SCORE_STARS_WEIGHT ?? 0.5),
    forksWeight: Number(process.env.SCORE_FORKS_WEIGHT ?? 0.3),
    recencyWeight: Number(process.env.SCORE_RECENCY_WEIGHT ?? 0.2),
    recencyDecay: Number(process.env.SCORE_RECENCY_DECAY ?? 0.03),
    formulaVersion: process.env.SCORE_FORMULA_VERSION ?? 'v1'
  },
  cache: {
    ttlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 300)
  },
  outbound: {
    maxConcurrent: Number(process.env.OUTBOUND_MAX_CONCURRENT ?? 2),
    minTimeMs: Number(process.env.OUTBOUND_MIN_TIME_MS ?? 300)
  }
});
