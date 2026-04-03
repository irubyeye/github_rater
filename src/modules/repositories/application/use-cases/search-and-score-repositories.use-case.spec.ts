import { AppLoggerService } from '../../../../common/observability/app-logger.service';
import { MetricsService } from '../../../../common/observability/metrics.service';
import { RequestContextService } from '../../../../common/observability/request-context.service';
import { GithubRepositoryProvider } from '../../domain/interfaces/github-repository.provider';
import { Repository } from '../../domain/models/repository.model';
import { RepositoryScoringService } from '../../domain/services/repository-scoring.service';
import { CacheKeyFactory } from '../../infrastructure/cache/cache-key.factory';
import { InFlightRequestsRegistry } from '../../infrastructure/cache/in-flight-requests.registry';
import { InMemoryQueryCacheService } from '../../infrastructure/cache/in-memory-query-cache.service';
import { SearchAndScoreRepositoriesUseCase } from './search-and-score-repositories.use-case';

function createRepository(id: number, stars: number): Repository {
  return {
    id,
    name: `repo-${id}`,
    fullName: `org/repo-${id}`,
    url: `https://github.com/org/repo-${id}`,
    language: 'TypeScript',
    stars,
    forks: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    pushedAt: new Date('2024-01-01T00:00:00.000Z')
  };
}

describe('SearchAndScoreRepositoriesUseCase', () => {
  const requestContextService = new RequestContextService();
  const appLoggerService = new AppLoggerService(requestContextService);
  const metricsService = new MetricsService();

  it('reuses processed cache across different pages for the same base filters', async () => {
    const repositories = [createRepository(1, 10), createRepository(2, 100), createRepository(3, 50)];
    const githubRepositoryProvider: GithubRepositoryProvider = {
      searchRepositories: jest.fn().mockResolvedValue(repositories)
    };

    const useCase = new SearchAndScoreRepositoriesUseCase(
      githubRepositoryProvider,
      new InMemoryQueryCacheService(),
      new InFlightRequestsRegistry(),
      new CacheKeyFactory(),
      new RepositoryScoringService({ formulaVersion: 'v1' }),
      300,
      appLoggerService,
      metricsService
    );

    const page1 = await useCase.execute({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      page: 1,
      limit: 2
    });

    const page2 = await useCase.execute({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      page: 2,
      limit: 2
    });

    expect(githubRepositoryProvider.searchRepositories).toHaveBeenCalledTimes(1);
    expect(page1.items.map((item) => item.id)).toEqual([2, 3]);
    expect(page2.items.map((item) => item.id)).toEqual([1]);
    expect(page2.meta.total).toBe(3);
  });

  it('deduplicates concurrent requests for the same base filters', async () => {
    const repositories = [createRepository(1, 10), createRepository(2, 100), createRepository(3, 50)];
    let resolveFetch: ((value: Repository[]) => void) | undefined;
    const fetchPromise = new Promise<Repository[]>((resolve) => {
      resolveFetch = resolve;
    });

    const githubRepositoryProvider: GithubRepositoryProvider = {
      searchRepositories: jest.fn().mockReturnValue(fetchPromise)
    };

    const useCase = new SearchAndScoreRepositoriesUseCase(
      githubRepositoryProvider,
      new InMemoryQueryCacheService(),
      new InFlightRequestsRegistry(),
      new CacheKeyFactory(),
      new RepositoryScoringService({ formulaVersion: 'v1' }),
      300,
      appLoggerService,
      metricsService
    );

    const firstRequest = useCase.execute({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      page: 1,
      limit: 1
    });

    const secondRequest = useCase.execute({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      page: 2,
      limit: 1
    });

    resolveFetch!(repositories);

    const firstResponse = await firstRequest;
    const secondResponse = await secondRequest;

    expect(githubRepositoryProvider.searchRepositories).toHaveBeenCalledTimes(1);
    expect(firstResponse.items.map((item) => item.id)).toEqual([2]);
    expect(secondResponse.items.map((item) => item.id)).toEqual([3]);
  });

  it('uses scoreFormulaVersion in cache key behavior', async () => {
    const repositories = [createRepository(1, 10)];
    const githubRepositoryProvider: GithubRepositoryProvider = {
      searchRepositories: jest.fn().mockResolvedValue(repositories)
    };
    const sharedCache = new InMemoryQueryCacheService();
    const sharedRegistry = new InFlightRequestsRegistry();
    const cacheKeyFactory = new CacheKeyFactory();

    const useCaseV1 = new SearchAndScoreRepositoriesUseCase(
      githubRepositoryProvider,
      sharedCache,
      sharedRegistry,
      cacheKeyFactory,
      new RepositoryScoringService({ formulaVersion: 'v1' }),
      300,
      appLoggerService,
      metricsService
    );

    const useCaseV2 = new SearchAndScoreRepositoriesUseCase(
      githubRepositoryProvider,
      sharedCache,
      sharedRegistry,
      cacheKeyFactory,
      new RepositoryScoringService({ formulaVersion: 'v2' }),
      300,
      appLoggerService,
      metricsService
    );

    await useCaseV1.execute({ language: 'TypeScript', createdAfter: '2024-01-01' });
    await useCaseV2.execute({ language: 'TypeScript', createdAfter: '2024-01-01' });

    expect(githubRepositoryProvider.searchRepositories).toHaveBeenCalledTimes(2);
  });

  it('sorts deterministically with tie-breakers', async () => {
    const repositories = [createRepository(2, 10), createRepository(1, 10), createRepository(3, 10)];
    repositories[0].forks = 2;
    repositories[1].forks = 1;
    repositories[2].forks = 2;

    const githubRepositoryProvider: GithubRepositoryProvider = {
      searchRepositories: jest.fn().mockResolvedValue(repositories)
    };

    const deterministicScoringService = {
      scoreFormulaVersion: 'v1',
      scoreRepositories: (input: Repository[]) =>
        input.map((repository) => ({
          ...repository,
          popularityScore: 1,
          scoreBreakdown: { stars: 0.5, forks: 0.3, recency: 0.2 }
        }))
    } as RepositoryScoringService;

    const useCase = new SearchAndScoreRepositoriesUseCase(
      githubRepositoryProvider,
      new InMemoryQueryCacheService(),
      new InFlightRequestsRegistry(),
      new CacheKeyFactory(),
      deterministicScoringService,
      300,
      appLoggerService,
      metricsService
    );

    const response = await useCase.execute({ page: 1, limit: 10 });
    expect(response.items.map((item) => item.id)).toEqual([2, 3, 1]);
  });
});
