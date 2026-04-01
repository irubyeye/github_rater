import { Injectable } from '@nestjs/common';
import {
  GithubRepositoryProvider,
  SearchRepositoriesParams
} from '../../domain/interfaces/github-repository.provider';
import { Repository } from '../../domain/models/repository.model';
import { GithubClient } from './github.client';
import { GithubMapper } from './github.mapper';

@Injectable()
export class GithubRepositoryProviderImpl implements GithubRepositoryProvider {
  constructor(
    private readonly githubClient: GithubClient,
    private readonly githubMapper: GithubMapper
  ) {}

  async searchRepositories(params: SearchRepositoriesParams): Promise<Repository[]> {
    const q = this.buildQuery(params.language, params.createdAfter);
    const items = await this.githubClient.searchRepositories({
      q,
      perPage: params.perPage,
      maxPages: params.maxPages,
      maxRepositories: params.maxRepositories
    });

    return items.map((item) => this.githubMapper.toRepository(item));
  }

  private buildQuery(language?: string, createdAfter?: string): string {
    const queryParts: string[] = [];

    if (language) {
      queryParts.push(`language:${language}`);
    }

    if (createdAfter) {
      queryParts.push(`created:>${createdAfter}`);
    }

    if (queryParts.length === 0) {
      return 'stars:>=0';
    }

    return queryParts.join(' ');
  }
}
