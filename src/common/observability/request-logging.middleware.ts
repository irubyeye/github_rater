import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppLoggerService } from './app-logger.service';
import { LogContext } from './log-context.enum';
import { MetricsService } from './metrics.service';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly appLoggerService: AppLoggerService,
    private readonly metricsService: MetricsService
  ) {}

  use(req: any, res: any, next: () => void): void {
    const requestIdHeader = req.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : requestIdHeader || randomUUID();
    const startTime = Date.now();

    res.setHeader('x-request-id', requestId);

    this.requestContextService.runWithRequestId(String(requestId), () => {
      this.metricsService.incrementTotalRequests();
      this.appLoggerService.info('HTTP request started', LogContext.HTTP, {
        method: req.method,
        path: req.originalUrl
      });

      res.on('finish', () => {
        const durationMs = Date.now() - startTime;
        this.metricsService.recordRequestDuration(durationMs);
        if (res.statusCode >= 400) {
          this.metricsService.incrementErrors();
        }

        this.appLoggerService.info('HTTP request finished', LogContext.HTTP, {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs
        });
      });

      next();
    });
  }
}
