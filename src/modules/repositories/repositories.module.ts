import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheKeyFactory } from './infrastructure/cache/cache-key.factory';
import { InFlightRequestsRegistry } from './infrastructure/cache/in-flight-requests.registry';
import { InMemoryQueryCacheService } from './infrastructure/cache/in-memory-query-cache.service';
import { QUERY_CACHE, queryCacheProvider } from './infrastructure/cache/cache.provider';
import { GithubClient } from './infrastructure/github/github.client';
import {
  createGithubClientConfig,
  createGithubSearchConfig,
  GITHUB_CLIENT_CONFIG,
  GITHUB_SEARCH_CONFIG
} from './infrastructure/github/github.config';
import { GithubMapper } from './infrastructure/github/github.mapper';
import { GithubRepositoriesSearchQueryService } from './infrastructure/github/github-repositories-search-query.service';
import { GithubRepositoryProviderImpl } from './infrastructure/github/github.repository.provider';

@Module({
  imports: [HttpModule],
  providers: [
    {
      provide: GITHUB_CLIENT_CONFIG,
      inject: [ConfigService],
      useFactory: createGithubClientConfig
    },
    {
      provide: GITHUB_SEARCH_CONFIG,
      inject: [ConfigService],
      useFactory: createGithubSearchConfig
    },
    queryCacheProvider,
    InMemoryQueryCacheService,
    CacheKeyFactory,
    InFlightRequestsRegistry,
    GithubClient,
    GithubMapper,
    GithubRepositoriesSearchQueryService,
    GithubRepositoryProviderImpl
  ],
  exports: [QUERY_CACHE, CacheKeyFactory, InFlightRequestsRegistry, GithubRepositoryProviderImpl]
})
export class RepositoriesModule {}
