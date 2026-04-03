import { Repository } from '../models/repository.model';
import { RepositoryScoreBreakdown } from '../models/repository-score-breakdown.model';
import { SCORE_FORMULA_VERSION } from '../models/score-formula-version.model';
import { ScoredRepository } from '../models/scored-repository.model';

export interface RepositoryScoringConfig {
  starsWeight: number;
  forksWeight: number;
  recencyWeight: number;
  recencyDecay: number;
}

const defaultConfig: RepositoryScoringConfig = {
  starsWeight: 0.5,
  forksWeight: 0.3,
  recencyWeight: 0.2,
  recencyDecay: 0.03
};

export class RepositoryScoringService {
  readonly scoreFormulaVersion = SCORE_FORMULA_VERSION;
  private readonly config: RepositoryScoringConfig;

  constructor(config: Partial<RepositoryScoringConfig> = {}) {
    this.config = {
      ...defaultConfig,
      ...config
    };
  }

  scoreRepository(repository: Repository, now: Date = new Date()): ScoredRepository {
    const scoreBreakdown = this.calculateScoreBreakdown(repository, now);
    const popularityScore = scoreBreakdown.stars + scoreBreakdown.forks + scoreBreakdown.recency;

    return {
      ...repository,
      popularityScore,
      scoreBreakdown
    };
  }

  scoreRepositories(repositories: Repository[], now: Date = new Date()): ScoredRepository[] {
    return repositories.map((repository) => this.scoreRepository(repository, now));
  }

  private calculateScoreBreakdown(repository: Repository, now: Date): RepositoryScoreBreakdown {
    const daysSinceLastPush = Math.max(0, (now.getTime() - repository.pushedAt.getTime()) / (1000 * 60 * 60 * 24));

    const stars = Math.log(repository.stars + 1) * this.config.starsWeight;
    const forks = Math.log(repository.forks + 1) * this.config.forksWeight;
    const recency = Math.exp(-this.config.recencyDecay * daysSinceLastPush) * this.config.recencyWeight;

    return {
      stars,
      forks,
      recency
    };
  }
}
