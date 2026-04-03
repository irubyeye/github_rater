import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { envValidationSchema } from './common/config/env.validation';
import { ObservabilityModule } from './common/observability/observability.module';
import { RequestLoggingMiddleware } from './common/observability/request-logging.middleware';
import { HealthModule } from './modules/health/health.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema
    }),
    ObservabilityModule,
    HealthModule,
    RepositoriesModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL
    });
  }
}
