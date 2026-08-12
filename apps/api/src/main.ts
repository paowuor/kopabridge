import { join } from 'path';
import { LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const logLevels: LogLevel[] = isProd
    ? ['log', 'warn', 'error']
    : ['verbose', 'debug', 'log', 'warn', 'error'];

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logLevels,
  });

  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Security headers (CSP, HSTS, X-Frame-Options, etc). Was a declared
  // dependency but never actually wired in.
  app.use(helmet());

  // CORS_ORIGIN was documented in .env.example but never read anywhere.
  // Supports a comma-separated list of allowed origins; falls back to
  // disallowing cross-origin requests if unset, rather than silently
  // allowing everything.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : false,
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  // All routes are versioned under /api/v1 except health/metrics, which
  // orchestrators and monitoring tools expect at a stable, unversioned
  // path.
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'metrics'],
  });

  const config = new DocumentBuilder()
    .setTitle('KopaBridge API')
    .setDescription(
      'Unified Energy Credit Infrastructure API for PAYGo solar providers',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Print which Redis configuration the app will use at runtime. This helps
  // verify that Railway's REDIS_URL is being picked up instead of localhost.
  try {
    const configService = app.get(ConfigService);
    const redisUrl = configService.get<string>('redis.url');
    if (redisUrl) {
      try {
        const parsed = new URL(redisUrl);
        const host = parsed.hostname;
        const port = parsed.port || '6379';
        const hasAuth = parsed.password ? 'yes' : 'no';
        console.log(`Redis config: url host=${host} port=${port} auth=${hasAuth}`);
      } catch (e) {
        console.log('Redis config: REDIS_URL present but invalid');
      }
    } else {
      const host = configService.get<string>('redis.host');
      const port = configService.get<number>('redis.port');
      console.log(`Redis config: host=${host} port=${port}`);
    }
  } catch (e) {
    // If ConfigService isn't available for some reason, fall back to env.
    console.log('Redis config: ', process.env.REDIS_URL ?? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
