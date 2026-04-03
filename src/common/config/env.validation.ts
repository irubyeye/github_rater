import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SWAGGER_PATH: z.string().default('docs'),
  GITHUB_TOKEN: z.string().optional().default(''),
  GITHUB_FETCH_PER_PAGE: z.coerce.number().int().min(1).max(100).default(100),
  GITHUB_MAX_FETCH_PAGES: z.coerce.number().int().min(1).default(1),
  GITHUB_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(100).default(5000),
  SCORE_STARS_WEIGHT: z.coerce.number().min(0).default(0.5),
  SCORE_FORKS_WEIGHT: z.coerce.number().min(0).default(0.3),
  SCORE_RECENCY_WEIGHT: z.coerce.number().min(0).default(0.2),
  SCORE_RECENCY_DECAY: z.coerce.number().min(0).default(0.03),
  SCORE_FORMULA_VERSION: z.string().min(1).default('v1'),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(300),
  OUTBOUND_MAX_CONCURRENT: z.coerce.number().int().min(1).default(2),
  OUTBOUND_MIN_TIME_MS: z.coerce.number().int().min(0).default(300)
});

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  return envSchema.parse(config);
}
