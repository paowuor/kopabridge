import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = randomUUID().slice(0, 8);
    const start = Date.now();

    req['requestId'] = requestId;

    res.on('finish', () => {
      const duration = Date.now() - start;

      console.log(
        `[REQ-${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
      );
    });

    next();
  }
}