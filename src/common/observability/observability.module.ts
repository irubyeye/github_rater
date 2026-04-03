import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';
import { MetricsService } from './metrics.service';
import { RequestContextService } from './request-context.service';

@Global()
@Module({
  providers: [RequestContextService, AppLoggerService, MetricsService],
  exports: [RequestContextService, AppLoggerService, MetricsService]
})
export class ObservabilityModule {}
