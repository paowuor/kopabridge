import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { register } from 'prom-client';
import { Public } from '../auth/decorators/public.decorator';

// NOTE: Prometheus scrapers don't send a JWT, so this route is exempted
// from the global auth guard. It should still be restricted at the
// network/ingress layer (e.g. nginx allow-list) rather than left open
// to the public internet.
@Controller('metrics')
export class MetricsController {
  @Public()
  @Get()
  async getMetrics(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Type', register.contentType);
    return await register.metrics();
  }
}
