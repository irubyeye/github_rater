import { Injectable } from '@nestjs/common';
import { Repository } from '../../domain/models/repository.model';
import { GithubRepositoryApiItem } from './github.client';

@Injectable()
export class GithubMapper {
  toRepository(item: GithubRepositoryApiItem): Repository {
    return {
      id: item.id,
      name: item.name,
      fullName: item.full_name,
      url: item.html_url,
      language: item.language,
      stars: item.stargazers_count,
      forks: item.forks_count,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      pushedAt: new Date(item.pushed_at)
    };
  }
}
