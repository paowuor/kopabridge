import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Type', register.contentType);
    return await register.metrics();
  }
}