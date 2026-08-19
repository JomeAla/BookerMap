import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HoneypotService } from './honeypot/honeypot.service';
import { getClientIp } from './honeypot/honeypot.middleware';

declare module 'express' {
  interface Request {
    id: string;
  }
}

function validateEnvironment(logger: Logger) {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missing: string[] = [];
  for (const v of requiredVars) {
    if (!process.env[v]) {
      missing.push(v);
    }
  }

  if (missing.length > 0) {
    logger.warn(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    logger.error('JWT_SECRET must be set in production');
    process.exit(1);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  validateEnvironment(logger);

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.id = randomUUID();
    next();
  });

  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

  const honeypot = app.get(HoneypotService);
  const decoyPaths = ['/admin', '/wp-admin', '/wp-login.php', '/_internal/debug'];
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (decoyPaths.includes(req.path)) {
      const ip = getClientIp(req);
      honeypot
        .recordHit({
          ip,
          trapType: 'DECOY_ENDPOINT',
          path: req.path,
          userAgent: req.headers['user-agent'] as string | undefined,
          referer: req.headers.referer as string | undefined,
        })
        .catch(() => undefined);
      res
        .status(200)
        .set('Content-Type', 'text/html')
        .send(
          '<!DOCTYPE html><html><head><title>Login</title></head><body><h1>Sign in</h1>' +
            '<form><input name="username" /><input name="password" type="password" /><button>Continue</button></form>' +
            '</body></html>',
        );
      return;
    }
    next();
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('BookerMap API')
    .setDescription('Multi-tenant booking and scheduling platform for home services')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
}
bootstrap();
