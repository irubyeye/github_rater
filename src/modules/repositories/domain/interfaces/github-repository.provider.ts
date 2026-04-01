import { Repository } from '../models/repository.model';

export interface SearchRepositoriesParams {
  language?: string;
  createdAfter?: string;
  perPage: number;
  maxPages: number;
  maxRepositories: number;
}

export interface GithubRepositoryProvider {
  searchRepositories(params: SearchRepositoriesParams): Promise<Repository[]>;
}
