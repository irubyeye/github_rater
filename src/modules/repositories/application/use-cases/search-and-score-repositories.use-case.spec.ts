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
});
