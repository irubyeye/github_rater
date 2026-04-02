import { Injectable } from '@nestjs/common';
import { QueryCache } from '../../domain/interfaces/query-cache.interface';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class InMemoryQueryCacheService implements QueryCache {
  private readonly storage = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.storage.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() >= entry.expiresAt) {
      this.storage.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.storage.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }
}
