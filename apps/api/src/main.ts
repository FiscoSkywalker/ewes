import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // blueprint/08_API_Specification.md §1 : chemin de base /api/v1
  app.setGlobalPrefix('api/v1');

  // blueprint/08_API_Specification.md §2 : contrat d'erreur unique { code, message, details, requestId }
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // blueprint/10_Security.md §3 : DTO validés systématiquement
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.get<string>('WEB_APP_URL', 'http://localhost:3000'),
    credentials: true,
  });

  // Documentation OpenAPI publiée sur un chemin non indexé (blueprint/08_API_Specification.md §1)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('EWES API')
    .setDescription(
      'API REST de la plateforme institutionnelle EWES — voir blueprint/08_API_Specification.md',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
}
await bootstrap();
