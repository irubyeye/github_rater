import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const runLive = process.env.RUN_LIVE_GITHUB_TESTS === 'true';

(runLive ? describe : describe.skip)('RepositoriesController (live e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is required for live e2e tests');
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

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

  afterAll(async () => {
    await app.close();
  });

  it('returns data from real GitHub API', async () => {
    const response = await request(app.getHttpServer())
      .get('/repositories')
      .query({
        language: 'TypeScript',
        createdAfter: '2024-01-01',
        page: 1,
        limit: 5
      })
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeLessThanOrEqual(5);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.limit).toBe(5);
    expect(response.body.meta.scoreFormulaVersion).toBe('v1');
  });
});
