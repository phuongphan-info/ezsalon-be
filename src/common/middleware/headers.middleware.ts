import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { headersStore } from '../stores/headers.store';

/**
 * Middleware to capture and store request headers globally
 * This allows accessing headers throughout the request lifecycle
 */
@Injectable()
export class HeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Store headers in AsyncLocalStorage for the duration of this request
    headersStore.setHeaders(req.headers);
    next();
  }
}
