import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Derrière Nginx (blueprint/18_Deployment.md), `req.ip` serait l'adresse du
  // proxy : tous les visiteurs partageraient la même limite de fréquence et
  // le même contexte d'audit. `TRUST_PROXY_HOPS` = nombre de proxys de confiance
  // devant l'API (1 avec Nginx) ; non défini en développement.
  const trustProxyHops = Number(config.get<string>('TRUST_PROXY_HOPS', '0'));
  if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
  }

  // blueprint/08_API_Specification.md §1 : chemin de base /api/v1
  app.setGlobalPrefix('api/v1');

  // blueprint/08_API_Specification.md §2 : contrat d'erreur unique { code, message, details, requestId }
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // blueprint/10_Security.md §3 : DTO validés systématiquement
  app.useGlobalPipes(createValidationPipe());

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
