import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstreamErrorHandlerService } from '../../common/errors/upstream-error-handler.service';
import {
  REPOSITORIES_CACHE_TTL_SECONDS,
  SearchAndScoreRepositoriesUseCase
} from './application/use-cases/search-and-score-repositories.use-case';
import { RepositoriesController } from './api/repositories.controller';
import { RepositoryScoringService } from './domain/services/repository-scoring.service';
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
import {
  GITHUB_REPOSITORY_PROVIDER,
  GithubRepositoryProviderImpl
} from './infrastructure/github/github.repository.provider';

@Module({
  imports: [HttpModule],
  controllers: [RepositoriesController],
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
    {
      provide: REPOSITORIES_CACHE_TTL_SECONDS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get<number>('cache.ttlSeconds', 300)
    },
    {
      provide: RepositoryScoringService,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const formulaVersion = configService.get<string>('scoring.formulaVersion');
        if (!formulaVersion) {
          throw new Error('scoring.formulaVersion is required');
        }

        return new RepositoryScoringService({
          starsWeight: configService.get<number>('scoring.starsWeight', 0.5),
          forksWeight: configService.get<number>('scoring.forksWeight', 0.3),
          recencyWeight: configService.get<number>('scoring.recencyWeight', 0.2),
          recencyDecay: configService.get<number>('scoring.recencyDecay', 0.03),
          formulaVersion
        });
      }
    },
    {
      provide: GITHUB_REPOSITORY_PROVIDER,
      useExisting: GithubRepositoryProviderImpl
    },
    queryCacheProvider,
    InMemoryQueryCacheService,
    CacheKeyFactory,
    InFlightRequestsRegistry,
    UpstreamErrorHandlerService,
    GithubClient,
    GithubMapper,
    GithubRepositoriesSearchQueryService,
    GithubRepositoryProviderImpl,
    SearchAndScoreRepositoriesUseCase
  ],
  exports: [
    QUERY_CACHE,
    GITHUB_REPOSITORY_PROVIDER,
    CacheKeyFactory,
    InFlightRequestsRegistry,
    RepositoryScoringService,
    SearchAndScoreRepositoriesUseCase
  ]
})
export class RepositoriesModule {}
