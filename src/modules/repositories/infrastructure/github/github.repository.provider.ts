import { Inject, Injectable } from '@nestjs/common';
import {
  GithubRepositoryProvider,
  SearchRepositoriesParams
} from '../../domain/interfaces/github-repository.provider';
import { Repository } from '../../domain/models/repository.model';
import { GithubClient } from './github.client';
import { GITHUB_SEARCH_CONFIG, GithubSearchConfig } from './github.config';
import { GithubMapper } from './github.mapper';

@Injectable()
export class GithubRepositoryProviderImpl implements GithubRepositoryProvider {
  private readonly queryPartBuilders: Array<(params: SearchRepositoriesParams) => string | null> = [
    (params) => (params.language ? `language:${params.language}` : null),
    (params) => (params.createdAfter ? `created:>${params.createdAfter}` : null)
  ];

  constructor(
    private readonly githubClient: GithubClient,
    private readonly githubMapper: GithubMapper,
    @Inject(GITHUB_SEARCH_CONFIG) private readonly config: GithubSearchConfig
  ) {}

  async searchRepositories(params: SearchRepositoriesParams): Promise<Repository[]> {
    const q = this.buildQuery(params);
    const items = await this.githubClient.searchRepositories({
      q,
      perPage: this.config.fetchPerPage,
      maxPages: this.config.maxFetchPages,
      maxRepositories: this.config.maxFetchRepositories
    });

    return items.map((item) => this.githubMapper.toRepository(item));
  }

  private buildQuery(params: SearchRepositoriesParams): string {
    const queryParts = this.queryPartBuilders
      .map((builder) => builder(params))
      .filter((part): part is string => part !== null);

    if (queryParts.length === 0) {
      return 'stars:>=0';
    }

    return queryParts.join(' ');
  }
}
