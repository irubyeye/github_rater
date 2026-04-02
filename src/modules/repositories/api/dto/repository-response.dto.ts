import { ApiProperty } from '@nestjs/swagger';

export class RepositoryScoreBreakdownResponseDto {
  @ApiProperty()
  stars!: number;

  @ApiProperty()
  forks!: number;

  @ApiProperty()
  recency!: number;
}

export class RepositoryItemResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ nullable: true })
  language!: string | null;

  @ApiProperty()
  stars!: number;

  @ApiProperty()
  forks!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty()
  pushedAt!: string;

  @ApiProperty()
  popularityScore!: number;

  @ApiProperty({ type: RepositoryScoreBreakdownResponseDto })
  scoreBreakdown!: RepositoryScoreBreakdownResponseDto;
}

export class RepositoriesMetaResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  scoreFormulaVersion!: string;
}

export class RepositoriesResponseDto {
  @ApiProperty({ type: [RepositoryItemResponseDto] })
  items!: RepositoryItemResponseDto[];

  @ApiProperty({ type: RepositoriesMetaResponseDto })
  meta!: RepositoriesMetaResponseDto;
}
