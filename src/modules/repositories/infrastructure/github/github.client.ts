import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bottleneck from 'bottleneck';
import { firstValueFrom } from 'rxjs';

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
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.limiter = new Bottleneck({
      maxConcurrent: this.configService.get<number>('outbound.maxConcurrent', 2),
      minTime: this.configService.get<number>('outbound.minTimeMs', 300)
    });
    this.token = this.configService.get<string>('github.token', '');
    this.timeoutMs = this.configService.get<number>('github.requestTimeoutMs', 5000);
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
            headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
            timeout: this.timeoutMs
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
