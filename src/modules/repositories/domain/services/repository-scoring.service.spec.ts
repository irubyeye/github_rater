import { Repository } from '../models/repository.model';
import { SCORE_FORMULA_VERSION } from '../models/score-formula-version.model';
import { RepositoryScoringService } from './repository-scoring.service';

const now = new Date('2026-01-10T00:00:00.000Z');

function buildRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 1,
    name: 'repo',
    fullName: 'org/repo',
    url: 'https://github.com/org/repo',
    language: 'TypeScript',
    stars: 10,
    forks: 5,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    pushedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
  };
}

describe('RepositoryScoringService', () => {
  it('increases score when stars increase', () => {
    const service = new RepositoryScoringService();
    const lowStars = service.scoreRepository(buildRepository({ stars: 10 }), now);
    const highStars = service.scoreRepository(buildRepository({ stars: 100 }), now);

    expect(highStars.popularityScore).toBeGreaterThan(lowStars.popularityScore);
    expect(highStars.scoreBreakdown.stars).toBeGreaterThan(lowStars.scoreBreakdown.stars);
  });

  it('increases score when forks increase', () => {
    const service = new RepositoryScoringService();
    const lowForks = service.scoreRepository(buildRepository({ forks: 5 }), now);
    const highForks = service.scoreRepository(buildRepository({ forks: 50 }), now);

    expect(highForks.popularityScore).toBeGreaterThan(lowForks.popularityScore);
    expect(highForks.scoreBreakdown.forks).toBeGreaterThan(lowForks.scoreBreakdown.forks);
  });

  it('gives higher recency for fresher pushedAt', () => {
    const service = new RepositoryScoringService();
    const stale = service.scoreRepository(buildRepository({ pushedAt: new Date('2025-10-01T00:00:00.000Z') }), now);
    const fresh = service.scoreRepository(buildRepository({ pushedAt: new Date('2026-01-09T00:00:00.000Z') }), now);

    expect(fresh.scoreBreakdown.recency).toBeGreaterThan(stale.scoreBreakdown.recency);
    expect(fresh.popularityScore).toBeGreaterThan(stale.popularityScore);
  });

  it('returns scoreBreakdown components', () => {
    const service = new RepositoryScoringService();
    const result = service.scoreRepository(buildRepository(), now);

    expect(result.scoreBreakdown).toEqual({
      stars: expect.any(Number),
      forks: expect.any(Number),
      recency: expect.any(Number)
    });
  });

  it('exposes stable scoreFormulaVersion', () => {
    const service = new RepositoryScoringService();

    expect(service.scoreFormulaVersion).toBe(SCORE_FORMULA_VERSION);
    expect(service.scoreFormulaVersion).toBe('v1');
  });
});
