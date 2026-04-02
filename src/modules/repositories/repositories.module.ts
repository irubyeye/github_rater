import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GithubClient } from './infrastructure/github/github.client';
import {
  createGithubClientConfig,
  createGithubSearchConfig,
  GITHUB_CLIENT_CONFIG,
  GITHUB_SEARCH_CONFIG
} from './infrastructure/github/github.config';
import { GithubMapper } from './infrastructure/github/github.mapper';
import { GithubRepositoryProviderImpl } from './infrastructure/github/github.repository.provider';

@Module({
  imports: [HttpModule],
  providers: [
    {
      provide: GITHUB_CLIENT_CONFIG,
      inject: [ConfigService],
      useFactory: createGithubClientConfig
    },
    {
      provide: GITHUB_SEARCH_CONFIG,
      inject: [ConfigService],
      useFactory: createGithubSearchConfig
    },
    GithubClient,
    GithubMapper,
    GithubRepositoryProviderImpl
  ],
  exports: [GithubRepositoryProviderImpl]
})
export class RepositoriesModule {}
