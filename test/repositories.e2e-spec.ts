import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GithubRepositoryProvider } from '../src/modules/repositories/domain/interfaces/github-repository.provider';
import { Repository } from '../src/modules/repositories/domain/models/repository.model';
import { GITHUB_REPOSITORY_PROVIDER } from '../src/modules/repositories/infrastructure/github/github.repository.provider';

describe('RepositoriesController (e2e)', () => {
  let app: INestApplication;
  const githubRepositoryProviderMock: GithubRepositoryProvider = {
    searchRepositories: jest.fn()
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(GITHUB_REPOSITORY_PROVIDER)
      .useValue(githubRepositoryProviderMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns repositories from mocked github provider', async () => {
    const repositories: Repository[] = [
      {
        id: 2,
        name: 'repo-b',
        fullName: 'org/repo-b',
        url: 'https://github.com/org/repo-b',
        language: 'TypeScript',
        stars: 10,
        forks: 2,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        pushedAt: new Date('2024-01-03T00:00:00.000Z')
      },
      {
        id: 1,
        name: 'repo-a',
        fullName: 'org/repo-a',
        url: 'https://github.com/org/repo-a',
        language: 'TypeScript',
        stars: 100,
        forks: 20,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        pushedAt: new Date('2024-01-03T00:00:00.000Z')
      }
    ];

    (githubRepositoryProviderMock.searchRepositories as jest.Mock).mockResolvedValue(repositories);

    const response = await request(app.getHttpServer())
      .get('/repositories')
      .query({ language: 'TypeScript', createdAfter: '2024-01-01', page: 1, limit: 2 })
      .expect(200);

    expect(githubRepositoryProviderMock.searchRepositories).toHaveBeenCalledWith({
      language: 'TypeScript',
      createdAfter: '2024-01-01'
    });
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0].id).toBe(1);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.limit).toBe(2);
    expect(response.body.meta.total).toBe(2);
    expect(response.body.meta.scoreFormulaVersion).toBe('v1');
  });

  it('returns 400 for invalid query', async () => {
    await request(app.getHttpServer()).get('/repositories').query({ page: 0 }).expect(400);
  });
});
