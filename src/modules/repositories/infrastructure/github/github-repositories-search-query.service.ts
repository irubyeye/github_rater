import { Injectable } from '@nestjs/common';
import { SearchRepositoriesParams } from '../../domain/interfaces/github-repository.provider';

@Injectable()
export class GithubRepositoriesSearchQueryService {
  buildSearchRepositoriesQuery(params: SearchRepositoriesParams): string {
    const queryParts: string[] = [];

    if (params.language) {
      queryParts.push(`language:${params.language}`);
    }

    if (params.createdAfter) {
      queryParts.push(`created:>${params.createdAfter}`);
    }

    if (queryParts.length === 0) {
      return 'stars:>=0';
    }

    return queryParts.join(' ');
  }
}
