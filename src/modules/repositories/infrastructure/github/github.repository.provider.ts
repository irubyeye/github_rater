import { Inject, Injectable } from '@nestjs/common';
import {
  GithubRepositoryProvider,
  SearchRepositoriesParams
} from '../../domain/interfaces/github-repository.provider';
import { Repository } from '../../domain/models/repository.model';
import { GithubClient } from './github.client';
import { GITHUB_SEARCH_CONFIG, GithubSearchConfig } from './github.config';
import { GithubMapper } from './github.mapper';
import { GithubRepositoriesSearchQueryService } from './github-repositories-search-query.service';

export const GITHUB_REPOSITORY_PROVIDER = Symbol('GITHUB_REPOSITORY_PROVIDER');

@Injectable()
export class GithubRepositoryProviderImpl implements GithubRepositoryProvider {
  constructor(
    private readonly githubClient: GithubClient,
    private readonly githubMapper: GithubMapper,
    private readonly githubRepositoriesSearchQueryService: GithubRepositoriesSearchQueryService,
    @Inject(GITHUB_SEARCH_CONFIG) private readonly config: GithubSearchConfig
  ) {}

  async searchRepositories(params: SearchRepositoriesParams): Promise<Repository[]> {
    const q = this.githubRepositoriesSearchQueryService.buildSearchRepositoriesQuery(params);
    const items = await this.githubClient.searchRepositories({
      q,
      perPage: this.config.fetchPerPage,
      maxPages: this.config.maxFetchPages
    });

    return items
      .map((item) => this.githubMapper.toRepository(item))
      .filter((repository): repository is Repository => repository !== null);
  }
}
