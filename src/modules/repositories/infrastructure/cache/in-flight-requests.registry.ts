import { Injectable } from '@nestjs/common';

@Injectable()
export class InFlightRequestsRegistry {
  private readonly registry = new Map<string, Promise<unknown>>();

  get<T>(key: string): Promise<T> | undefined {
    return this.registry.get(key) as Promise<T> | undefined;
  }

  set<T>(key: string, request: Promise<T>): void {
    this.registry.set(key, request);
  }

  delete(key: string): void {
    this.registry.delete(key);
  }
}
