import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  SWAGGER_PATH: Joi.string().default('docs'),
  GITHUB_TOKEN: Joi.string().allow('').default(''),
  GITHUB_FETCH_PER_PAGE: Joi.number().integer().min(1).max(100).default(100),
  GITHUB_MAX_FETCH_PAGES: Joi.number().integer().min(1).default(1),
  GITHUB_REQUEST_TIMEOUT_MS: Joi.number().integer().min(100).default(5000),
  SCORE_STARS_WEIGHT: Joi.number().min(0).default(0.5),
  SCORE_FORKS_WEIGHT: Joi.number().min(0).default(0.3),
  SCORE_RECENCY_WEIGHT: Joi.number().min(0).default(0.2),
  SCORE_RECENCY_DECAY: Joi.number().min(0).default(0.03),
  SCORE_FORMULA_VERSION: Joi.string().default('v1'),
  CACHE_TTL_SECONDS: Joi.number().integer().min(1).default(300),
  OUTBOUND_MAX_CONCURRENT: Joi.number().integer().min(1).default(2),
  OUTBOUND_MIN_TIME_MS: Joi.number().integer().min(0).default(300)
});
