import { Injectable } from '@nestjs/common';
import { createLogger, format, Logger, transports } from 'winston';
import { LogContext } from './log-context.enum';
import { RequestContextService } from './request-context.service';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable()
export class AppLoggerService {
  private readonly logger: Logger;

  constructor(private readonly requestContextService: RequestContextService) {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL ?? 'info',
      format: format.combine(format.timestamp(), format.json()),
      transports: [new transports.Console()]
    });
  }

  debug(message: string, context: LogContext, metadata?: Record<string, unknown>): void {
    this.write('debug', message, context, metadata);
  }

  info(message: string, context: LogContext, metadata?: Record<string, unknown>): void {
    this.write('info', message, context, metadata);
  }

  warn(message: string, context: LogContext, metadata?: Record<string, unknown>): void {
    this.write('warn', message, context, metadata);
  }

  error(
    message: string,
    context: LogContext,
    metadata?: Record<string, unknown>,
    error?: unknown
  ): void {
    const stack = error instanceof Error ? error.stack : undefined;
    this.write('error', message, context, { ...metadata, stack });
  }

  private write(
    level: LogLevel,
    message: string,
    context: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    const details: Record<string, unknown> = {
      context,
      requestId: this.requestContextService.getRequestId() ?? null
    };

    if (metadata && Object.keys(metadata).length > 0) {
      details.metadata = metadata;
    }

    this.logger.log(level, message, details);
  }
}
