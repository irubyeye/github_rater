import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AxiosError } from 'axios';
import { AppLoggerService } from '../observability/app-logger.service';
import { LogContext } from '../observability/log-context.enum';

export interface UpstreamErrorHandlerOptions {
  serviceName: string;
  timeoutMessage?: string;
  unavailableMessage?: string;
  rateLimitMessage?: string;
  isRateLimited?: (error: AxiosError) => boolean;
}

@Injectable()
export class UpstreamErrorHandlerService {
  constructor(private readonly appLoggerService: AppLoggerService) {}

  handle(error: unknown, options: UpstreamErrorHandlerOptions): never {
    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNABORTED') {
      this.appLoggerService.error('Upstream timeout', LogContext.UPSTREAM_ERROR_HANDLER_SERVICE, {
        serviceName: options.serviceName,
        code: axiosError.code
      });
      throw new ServiceUnavailableException(
        options.timeoutMessage ?? `${options.serviceName} request timed out`
      );
    }

    const isRateLimited = options.isRateLimited?.(axiosError) ?? false;
    if (isRateLimited) {
      this.appLoggerService.warn('Upstream rate limited', LogContext.UPSTREAM_ERROR_HANDLER_SERVICE, {
        serviceName: options.serviceName,
        status: axiosError.response?.status
      });
      throw new HttpException(
        options.rateLimitMessage ?? `${options.serviceName} rate limit exceeded`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    this.appLoggerService.error('Upstream unavailable', LogContext.UPSTREAM_ERROR_HANDLER_SERVICE, {
      serviceName: options.serviceName,
      status: axiosError.response?.status,
      code: axiosError.code
    });
    throw new ServiceUnavailableException(
      options.unavailableMessage ?? `${options.serviceName} service is currently unavailable`
    );
  }
}
