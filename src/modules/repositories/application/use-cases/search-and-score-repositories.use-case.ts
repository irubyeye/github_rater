import { Inject, Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../../../common/observability/app-logger.service';
import { LogContext } from '../../../../common/observability/log-context.enum';
import { MetricsService } from '../../../../common/observability/metrics.service';
import {
  GithubRepositoryProvider,
  SearchRepositoriesParams
} from '../../domain/interfaces/github-repository.provider';
import { QueryCache } from '../../domain/interfaces/query-cache.interface';
import { ScoredRepository } from '../../domain/models/scored-repository.model';
import { RepositoryScoringService } from '../../domain/services/repository-scoring.service';
import { CacheKeyFactory } from '../../infrastructure/cache/cache-key.factory';
import { InFlightRequestsRegistry } from '../../infrastructure/cache/in-flight-requests.registry';
import { QUERY_CACHE } from '../../infrastructure/cache/cache.provider';
import { GITHUB_REPOSITORY_PROVIDER } from '../../infrastructure/github/github.repository.provider';

export const REPOSITORIES_CACHE_TTL_SECONDS = Symbol('REPOSITORIES_CACHE_TTL_SECONDS');

export interface SearchAndScoreRepositoriesInput extends SearchRepositoriesParams {
  page?: number;
  limit?: number;
}

export interface RepositoriesResponse {
  items: ScoredRepository[];
  meta: {
    page: number;
    limit: number;
    total: number;
    scoreFormulaVersion: string;
  };
}

@Injectable()
export class SearchAndScoreRepositoriesUseCase {
  constructor(
    @Inject(GITHUB_REPOSITORY_PROVIDER)
    private readonly githubRepositoryProvider: GithubRepositoryProvider,
    @Inject(QUERY_CACHE) private readonly queryCache: QueryCache,
    private readonly inFlightRequestsRegistry: InFlightRequestsRegistry,
    private readonly cacheKeyFactory: CacheKeyFactory,
    private readonly repositoryScoringService: RepositoryScoringService,
    @Inject(REPOSITORIES_CACHE_TTL_SECONDS) private readonly cacheTtlSeconds: number,
    private readonly appLoggerService: AppLoggerService,
    private readonly metricsService: MetricsService
  ) {}

  async execute(input: SearchAndScoreRepositoriesInput): Promise<RepositoriesResponse> {
    this.appLoggerService.info('Repositories search started', LogContext.SEARCH_AND_SCORE_REPOSITORIES_USE_CASE, {
      language: input.language ?? null,
      createdAfter: input.createdAfter ?? null,
      page: input.page ?? null,
      limit: input.limit ?? null
    });
    const page = this.normalizePage(input.page);
    const limit = this.normalizeLimit(input.limit);
    const processedRepositories = await this.getProcessedRepositories(input);
    const response = this.paginateAndShape(processedRepositories, page, limit);
    this.appLoggerService.info(
      'Repositories search finished',
      LogContext.SEARCH_AND_SCORE_REPOSITORIES_USE_CASE,
      {
        page: response.meta.page,
        limit: response.meta.limit,
        total: response.meta.total,
        returnedItems: response.items.length
      }
    );
    return response;
  }

  private async getProcessedRepositories(
    input: SearchAndScoreRepositoriesInput
  ): Promise<ScoredRepository[]> {
    const cacheKey = this.buildBaseCacheKey(input.language, input.createdAfter);
    const cached = await this.queryCache.get<ScoredRepository[]>(cacheKey);
    if (cached) {
      this.metricsService.incrementCacheHit();
      this.appLoggerService.info(
        'Cache hit for processed repositories',
        LogContext.SEARCH_AND_SCORE_REPOSITORIES_USE_CASE,
        {
          cacheKey
        }
      );
      return cached;
    }

    this.metricsService.incrementCacheMiss();
    this.appLoggerService.info(
      'Cache miss for processed repositories',
      LogContext.SEARCH_AND_SCORE_REPOSITORIES_USE_CASE,
      {
        cacheKey
      }
    );

    const inFlight = this.inFlightRequestsRegistry.get<ScoredRepository[]>(cacheKey);
    if (inFlight) {
      this.appLoggerService.info(
        'Using in-flight request',
        LogContext.SEARCH_AND_SCORE_REPOSITORIES_USE_CASE,
        {
          cacheKey
        }
      );
      return inFlight;
    }

    const request = this.fetchAndProcessRepositories({
      language: input.language,
      createdAfter: input.createdAfter,
      cacheKey
    }).finally(() => {
      this.inFlightRequestsRegistry.delete(cacheKey);
    });

    this.inFlightRequestsRegistry.set(cacheKey, request);
    return request;
  }

  private buildBaseCacheKey(language?: string, createdAfter?: string): string {
    return this.cacheKeyFactory.createBaseKey({
      language,
      createdAfter,
      scoreFormulaVersion: this.repositoryScoringService.scoreFormulaVersion
    });
  }

  private async fetchAndProcessRepositories(params: {
    language?: string;
    createdAfter?: string;
    cacheKey: string;
  }): Promise<ScoredRepository[]> {
    this.appLoggerService.info(
      'Fetching repositories from provider',
      LogContext.SEARCH_AND_SCORE_REPOSITORIES_USE_CASE,
      {
        language: params.language ?? null,
        createdAfter: params.createdAfter ?? null
      }
    );
    const repositories = await this.githubRepositoryProvider.searchRepositories({
      language: params.language,
      createdAfter: params.createdAfter
    });

    const scoredRepositories = this.repositoryScoringService
      .scoreRepositories(repositories)
      .sort((a, b) => b.popularityScore - a.popularityScore);

    await this.queryCache.set(params.cacheKey, scoredRepositories, this.cacheTtlSeconds);
    this.appLoggerService.info(
      'Processed repositories cached',
      LogContext.SEARCH_AND_SCORE_REPOSITORIES_USE_CASE,
      {
        cacheKey: params.cacheKey,
        totalItems: scoredRepositories.length
      }
    );
    return scoredRepositories;
  }

  private paginateAndShape(items: ScoredRepository[], page: number, limit: number): RepositoriesResponse {
    const total = items.length;
    const start = (page - 1) * limit;

    return {
      items: items.slice(start, start + limit),
      meta: {
        page,
        limit,
        total,
        scoreFormulaVersion: this.repositoryScoringService.scoreFormulaVersion
      }
    };
  }

  private normalizePage(page?: number): number {
    if (!page || page < 1) {
      return 1;
    }

    return Math.floor(page);
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || limit < 1) {
      return 20;
    }

    return Math.min(Math.floor(limit), 100);
  }
}
