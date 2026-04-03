import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  RepositoriesResponse,
  SearchAndScoreRepositoriesUseCase
} from '../application/use-cases/search-and-score-repositories.use-case';
import { GetRepositoriesQueryDto } from './dto/get-repositories.query.dto';
import { RepositoriesResponseDto } from './dto/repository-response.dto';

@ApiTags('repositories')
@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly searchAndScoreRepositoriesUseCase: SearchAndScoreRepositoriesUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Search and rank repositories' })
  @ApiOkResponse({ type: RepositoriesResponseDto })
  async getRepositories(@Query() query: GetRepositoriesQueryDto): Promise<RepositoriesResponseDto> {
    const response = await this.searchAndScoreRepositoriesUseCase.execute(query);
    return this.toResponseDto(response);
  }

  private toResponseDto(response: RepositoriesResponse): RepositoriesResponseDto {
    return {
      items: response.items.map((item) => ({
        id: item.id,
        name: item.name,
        fullName: item.fullName,
        url: item.url,
        language: item.language,
        stars: item.stars,
        forks: item.forks,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        pushedAt: item.pushedAt.toISOString(),
        popularityScore: item.popularityScore,
        scoreBreakdown: {
          stars: item.scoreBreakdown.stars,
          forks: item.scoreBreakdown.forks,
          recency: item.scoreBreakdown.recency
        }
      })),
      meta: {
        page: response.meta.page,
        limit: response.meta.limit,
        total: response.meta.total,
        scoreFormulaVersion: response.meta.scoreFormulaVersion
      }
    };
  }
}
