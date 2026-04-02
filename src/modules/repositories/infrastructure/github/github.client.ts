import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import { firstValueFrom } from 'rxjs';
import { GITHUB_CLIENT_CONFIG, GithubClientConfig } from './github.config';

export interface GithubRepositoryApiItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

interface GithubSearchResponse {
  items: GithubRepositoryApiItem[];
}

interface GithubSearchParams {
  q: string;
  perPage: number;
  maxPages: number;
  maxRepositories: number;
}

@Injectable()
export class GithubClient {
  private readonly limiter: Bottleneck;

  constructor(
    private readonly httpService: HttpService,
    @Inject(GITHUB_CLIENT_CONFIG) private readonly config: GithubClientConfig
  ) {
    this.limiter = new Bottleneck({
      maxConcurrent: this.config.maxConcurrent,
      minTime: this.config.minTimeMs
    });
  }

  async searchRepositories(params: GithubSearchParams): Promise<GithubRepositoryApiItem[]> {
    const allItems: GithubRepositoryApiItem[] = [];

    for (let page = 1; page <= params.maxPages; page += 1) {
      if (allItems.length >= params.maxRepositories) {
        break;
      }

      const response = await this.limiter.schedule(() =>
        firstValueFrom(
          this.httpService.get<GithubSearchResponse>('https://api.github.com/search/repositories', {
            params: {
              q: params.q,
              per_page: params.perPage,
              page
            },
            headers: this.config.token ? { Authorization: `Bearer ${this.config.token}` } : undefined,
            timeout: this.config.requestTimeoutMs
          })
        )
      );

      const pageItems = response.data.items ?? [];
      if (pageItems.length === 0) {
        break;
      }

      allItems.push(...pageItems);
    }

    return allItems.slice(0, params.maxRepositories);
  }
}
