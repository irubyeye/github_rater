import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AxiosError } from 'axios';

export interface UpstreamErrorHandlerOptions {
  serviceName: string;
  timeoutMessage?: string;
  unavailableMessage?: string;
  rateLimitMessage?: string;
  isRateLimited?: (error: AxiosError) => boolean;
}

@Injectable()
export class UpstreamErrorHandlerService {
  handle(error: unknown, options: UpstreamErrorHandlerOptions): never {
    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNABORTED') {
      throw new ServiceUnavailableException(
        options.timeoutMessage ?? `${options.serviceName} request timed out`
      );
    }

    const isRateLimited = options.isRateLimited?.(axiosError) ?? false;
    if (isRateLimited) {
      throw new HttpException(
        options.rateLimitMessage ?? `${options.serviceName} rate limit exceeded`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    throw new ServiceUnavailableException(
      options.unavailableMessage ?? `${options.serviceName} service is currently unavailable`
    );
  }
}
