import { Injectable } from '@nestjs/common';

export interface CacheKeyInput {
  language?: string;
  createdAfter?: string;
  scoreFormulaVersion: string;
}

@Injectable()
export class CacheKeyFactory {
  createBaseKey(input: CacheKeyInput): string {
    const language = input.language ?? 'any';
    const createdAfter = input.createdAfter ?? 'any';

    return `repos:language=${language}:createdAfter=${createdAfter}:score=${input.scoreFormulaVersion}`;
  }
}
