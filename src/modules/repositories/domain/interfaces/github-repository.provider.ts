import { Repository } from '../models/repository.model';

export interface SearchRepositoriesParams {
  language?: string;
  createdAfter?: string;
}

export interface GithubRepositoryProvider {
  searchRepositories(params: SearchRepositoriesParams): Promise<Repository[]>;
}
