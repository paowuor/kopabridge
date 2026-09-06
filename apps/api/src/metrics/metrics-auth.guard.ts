import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Guards the Prometheus /metrics endpoint with a static bearer token.
 *
 * Standard Prometheus scrapers don't ship a JWT, but they do support a
 * static bearer token or basic auth. Gate this endpoint behind the
 * METRICS_TOKEN env var so it is never reachable anonymously. If
 * METRICS_TOKEN is not configured the endpoint fails closed (401).
 */
@Injectable()
export class MetricsAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('metrics.token');

    if (!expected) {
      throw new UnauthorizedException(
        'Metric scraping is disabled. Set METRICS_TOKEN to enable it.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token for /metrics');
    }

    const provided = authHeader.slice('Bearer '.length).trim();

    if (provided !== expected) {
      throw new UnauthorizedException('Invalid bearer token for /metrics');
    }

    return true;
  }
}