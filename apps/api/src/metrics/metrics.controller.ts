import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { register } from 'prom-client';
import { Public } from '../auth/decorators/public.decorator';
import { MetricsAuthGuard } from './metrics-auth.guard';

// NOTE: Prometheus scrapers don't send a JWT, so this route stays exempt
// from the global JWT guard and is instead protected by MetricsAuthGuard,
// which requires a static METRICS_TOKEN bearer token. Set METRICS_TOKEN in
// the deployment environment and configure the scraper to send it.
@Controller('metrics')
@UseGuards(MetricsAuthGuard)
export class MetricsController {
  @Public()
  @Get()
  async getMetrics(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Type', register.contentType);
    return await register.metrics();
  }
}
