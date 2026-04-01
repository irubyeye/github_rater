import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  app.useLogger(new Logger());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const configService = app.get(ConfigService);
  const swaggerPath = configService.get<string>('app.swaggerPath', 'docs');
  const port = configService.get<number>('app.port', 3000);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GitHub Rater API')
    .setDescription('API for ranking GitHub repositories')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, document);

  await app.listen(port);
}

bootstrap();
