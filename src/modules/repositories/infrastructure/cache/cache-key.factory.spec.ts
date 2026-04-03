import { CacheKeyFactory } from './cache-key.factory';

describe('CacheKeyFactory', () => {
  it('includes only base filters and score formula version', () => {
    const factory = new CacheKeyFactory();

    const key = factory.createBaseKey({
      language: 'typescript',
      createdAfter: '2024-01-01',
      scoreFormulaVersion: 'v1'
    });

    expect(key).toBe('repos:language=typescript:createdAfter=2024-01-01:score=v1');
  });

  it('changes key when scoreFormulaVersion changes', () => {
    const factory = new CacheKeyFactory();

    const keyV1 = factory.createBaseKey({
      language: 'typescript',
      createdAfter: '2024-01-01',
      scoreFormulaVersion: 'v1'
    });

    const keyV2 = factory.createBaseKey({
      language: 'typescript',
      createdAfter: '2024-01-01',
      scoreFormulaVersion: 'v2'
    });

    expect(keyV1).not.toBe(keyV2);
  });
});
