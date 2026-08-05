import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Removed the duplicate static `GET /health` that used to live here —
  // it collided with HealthController's `GET /health`, which does a real
  // Terminus-backed DB ping. Use that one instead.
}
