import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import configuration from '../../../../common/config/configuration';

type AppConfig = ReturnType<typeof configuration>;

const githubClientConfigSchema = z.object({
  token: z.string(),
  requestTimeoutMs: z.number().int().min(100),
  maxConcurrent: z.number().int().min(1),
  minTimeMs: z.number().int().min(0)
});

const githubSearchConfigSchema = z.object({
  fetchPerPage: z.number().int().min(1).max(100),
  maxFetchPages: z.number().int().min(1),
});

export type GithubClientConfig = z.infer<typeof githubClientConfigSchema>;
export type GithubSearchConfig = z.infer<typeof githubSearchConfigSchema>;

export const GITHUB_CLIENT_CONFIG = Symbol('GITHUB_CLIENT_CONFIG');
export const GITHUB_SEARCH_CONFIG = Symbol('GITHUB_SEARCH_CONFIG');

export function createGithubClientConfig(configService: ConfigService<AppConfig, true>): GithubClientConfig {
  return githubClientConfigSchema.parse({
    token: configService.get('github.token', { infer: true }),
    requestTimeoutMs: configService.get('github.requestTimeoutMs', { infer: true }),
    maxConcurrent: configService.get('outbound.maxConcurrent', { infer: true }),
    minTimeMs: configService.get('outbound.minTimeMs', { infer: true })
  });
}

export function createGithubSearchConfig(configService: ConfigService<AppConfig, true>): GithubSearchConfig {
  return githubSearchConfigSchema.parse({
    fetchPerPage: configService.get('github.fetchPerPage', { infer: true }),
    maxFetchPages: configService.get('github.maxFetchPages', { infer: true }),
  });
}
