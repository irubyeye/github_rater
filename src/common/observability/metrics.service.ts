import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  incrementTotalRequests(): void {
    this.increment('requests_total');
  }

  incrementErrors(): void {
    this.increment('errors_total');
  }

  incrementCacheHit(): void {
    this.increment('cache_hits_total');
  }

  incrementCacheMiss(): void {
    this.increment('cache_misses_total');
  }

  recordExternalApiLatency(durationMs: number): void {
    this.observe('external_api_latency_ms', durationMs);
  }

  recordRequestDuration(durationMs: number): void {
    this.observe('request_duration_ms', durationMs);
  }

  snapshot(): Record<string, number | number[]> {
    const counters: Record<string, number> = {};
    const histograms: Record<string, number[]> = {};

    for (const [key, value] of this.counters.entries()) {
      counters[key] = value;
    }

    for (const [key, value] of this.histograms.entries()) {
      histograms[key] = [...value];
    }

    return {
      ...counters,
      ...histograms
    };
  }

  private increment(metricName: string): void {
    const current = this.counters.get(metricName) ?? 0;
    this.counters.set(metricName, current + 1);
  }

  private observe(metricName: string, value: number): void {
    const current = this.histograms.get(metricName) ?? [];
    current.push(value);
    this.histograms.set(metricName, current);
  }
}
