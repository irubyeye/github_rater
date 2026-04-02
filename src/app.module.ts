import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { envValidationSchema } from './common/config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema
    }),
    HealthModule,
    RepositoriesModule
  ]
})
export class AppModule {}
