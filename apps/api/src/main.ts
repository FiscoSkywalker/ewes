import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { assertProductionSecrets } from './common/config/production-secrets.js';
import { securityHeaders } from './common/http/security-headers.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // blueprint/10_Security.md : pas de démarrage en production avec des secrets d'exemple.
  assertProductionSecrets({
    NODE_ENV: config.get<string>('NODE_ENV'),
    JWT_ACCESS_SECRET: config.get<string>('JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: config.get<string>('JWT_REFRESH_SECRET'),
    REVALIDATE_SECRET: config.get<string>('REVALIDATE_SECRET'),
    WEB_REVALIDATE_URL: config.get<string>('WEB_REVALIDATE_URL'),
    DATABASE_URL: config.get<string>('DATABASE_URL'),
  });

  // Ne pas annoncer la technologie du serveur ; en-têtes de sécurité sur /api/v1.
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(securityHeaders);

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

  // Documentation OpenAPI : développement seulement. En production elle décrirait
  // gratuitement toute la surface de l'API à qui l'atteindrait (revue de sécurité
  // du 2026-10-08) ; le contrat reste lisible dans le dépôt (blueprint/08).
  if (config.get<string>('NODE_ENV') !== 'production') {
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
  }

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
}
await bootstrap();
