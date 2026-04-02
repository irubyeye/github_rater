import { Injectable } from '@nestjs/common';

export interface CacheKeyInput {
  language?: string;
  createdAfter?: string;
  page: number;
  limit: number;
  scoreFormulaVersion: string;
}

@Injectable()
export class CacheKeyFactory {
  create(input: CacheKeyInput): string {
    const language = input.language ?? 'any';
    const createdAfter = input.createdAfter ?? 'any';

    return `repos:language=${language}:createdAfter=${createdAfter}:page=${input.page}:limit=${input.limit}:score=${input.scoreFormulaVersion}`;
  }
}
