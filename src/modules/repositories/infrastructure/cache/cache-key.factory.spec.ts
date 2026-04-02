import { CacheKeyFactory } from './cache-key.factory';

describe('CacheKeyFactory', () => {
  it('includes filters and pagination in key', () => {
    const factory = new CacheKeyFactory();

    const key = factory.create({
      language: 'typescript',
      createdAfter: '2024-01-01',
      page: 1,
      limit: 20,
      scoreFormulaVersion: 'v1'
    });

    expect(key).toBe(
      'repos:language=typescript:createdAfter=2024-01-01:page=1:limit=20:score=v1'
    );
  });

  it('changes key when scoreFormulaVersion changes', () => {
    const factory = new CacheKeyFactory();

    const keyV1 = factory.create({
      language: 'typescript',
      createdAfter: '2024-01-01',
      page: 1,
      limit: 20,
      scoreFormulaVersion: 'v1'
    });

    const keyV2 = factory.create({
      language: 'typescript',
      createdAfter: '2024-01-01',
      page: 1,
      limit: 20,
      scoreFormulaVersion: 'v2'
    });

    expect(keyV1).not.toBe(keyV2);
  });
});
