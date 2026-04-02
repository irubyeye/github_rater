import { Inject, Injectable } from '@nestjs/common';
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
    @Inject(REPOSITORIES_CACHE_TTL_SECONDS) private readonly cacheTtlSeconds: number
  ) {}

  async execute(input: SearchAndScoreRepositoriesInput): Promise<RepositoriesResponse> {
    const page = this.normalizePage(input.page);
    const limit = this.normalizeLimit(input.limit);
    const cacheKey = this.cacheKeyFactory.create({
      language: input.language,
      createdAfter: input.createdAfter,
      page,
      limit,
      scoreFormulaVersion: this.repositoryScoringService.scoreFormulaVersion
    });

    const cached = await this.queryCache.get<RepositoriesResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = this.inFlightRequestsRegistry.get<RepositoriesResponse>(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const request = this.fetchAndBuildResponse({
      language: input.language,
      createdAfter: input.createdAfter,
      page,
      limit,
      cacheKey
    }).finally(() => {
      this.inFlightRequestsRegistry.delete(cacheKey);
    });

    this.inFlightRequestsRegistry.set(cacheKey, request);
    return request;
  }

  private async fetchAndBuildResponse(params: {
    language?: string;
    createdAfter?: string;
    page: number;
    limit: number;
    cacheKey: string;
  }): Promise<RepositoriesResponse> {
    const repositories = await this.githubRepositoryProvider.searchRepositories({
      language: params.language,
      createdAfter: params.createdAfter
    });

    const scoredRepositories = this.repositoryScoringService
      .scoreRepositories(repositories)
      .sort((a, b) => b.popularityScore - a.popularityScore);

    const response = this.paginateAndShape(scoredRepositories, params.page, params.limit);
    await this.queryCache.set(params.cacheKey, response, this.cacheTtlSeconds);
    return response;
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
