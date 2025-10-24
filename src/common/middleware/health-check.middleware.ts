import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HealthCheckMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HealthCheckMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Only log health check requests in development or if explicitly enabled
    const shouldLog = process.env.NODE_ENV === 'development' || 
                     process.env.LOG_HEALTH_CHECKS === 'true';

    if (shouldLog) {
      this.logger.log(`Health check request: ${req.method} ${req.originalUrl}`);
    }

    // Add health check headers early (before response is sent)
    res.setHeader('X-Health-Check-Version', '1.0.0');
    res.setHeader('X-Service-Name', 'ezsalon-api');

    // Log response when finished (without trying to modify headers)
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      if (shouldLog) {
        this.logger.log(
          `Health check response: ${req.method} ${req.originalUrl} - ${res.statusCode} (${responseTime}ms)`
        );
      }
    });
    
    next();
  }
}