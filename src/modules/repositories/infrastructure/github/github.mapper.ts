import { Injectable } from '@nestjs/common';
import { Repository } from '../../domain/models/repository.model';
import { GithubRepositoryApiItem } from './github.client';

@Injectable()
export class GithubMapper {
  toRepository(item: GithubRepositoryApiItem): Repository | null {
    const createdAt = new Date(item.created_at);
    const updatedAt = new Date(item.updated_at);
    const pushedAt = new Date(item.pushed_at);
    if (Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime()) || Number.isNaN(pushedAt.getTime())) {
      return null;
    }

    return {
      id: item.id,
      name: item.name,
      fullName: item.full_name,
      url: item.html_url,
      language: item.language,
      stars: this.sanitizeCount(item.stargazers_count),
      forks: this.sanitizeCount(item.forks_count),
      createdAt,
      updatedAt,
      pushedAt
    };
  }

  private sanitizeCount(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.floor(value);
  }
}
