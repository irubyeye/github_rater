import { Repository } from './repository.model';
import { RepositoryScoreBreakdown } from './repository-score-breakdown.model';

export interface ScoredRepository extends Repository {
  popularityScore: number;
  scoreBreakdown: RepositoryScoreBreakdown;
}
