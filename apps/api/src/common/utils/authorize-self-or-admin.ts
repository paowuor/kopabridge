import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';

// Existing Logger Middleware
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    const { method, originalUrl, ip } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const logMessage = `[${requestId}]${method} ${originalUrl}${statusCode} - ${duration}ms - IP:${ip}`;

      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}

// Authorization Function using the correct AuthenticatedUser interface
export function assertSelfOrAdmin(
  user: AuthenticatedUser | undefined,
  targetUserId: string,
): void {
  // Check if user exists
  if (!user) {
    throw new ForbiddenException('User not authenticated');
  }

  // Get the user ID from the userId property
  const userId = user.userId;
  
  if (!userId) {
    throw new ForbiddenException('User ID not found');
  }

  // Allow if user is accessing their own data
  if (userId === targetUserId) {
    return;
  }

  // Allow if user is an admin
  if (user.role === 'admin' || user.role === 'ADMIN') {
    return;
  }

  throw new ForbiddenException(
    'You do not have permission to access this resource',
  );
}
