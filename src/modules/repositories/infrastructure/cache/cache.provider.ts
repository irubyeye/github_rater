import { Provider } from '@nestjs/common';
import { QueryCache } from '../../domain/interfaces/query-cache.interface';
import { InMemoryQueryCacheService } from './in-memory-query-cache.service';

export const QUERY_CACHE = Symbol('QUERY_CACHE');

export const queryCacheProvider: Provider<QueryCache> = {
  provide: QUERY_CACHE,
  useClass: InMemoryQueryCacheService
};
