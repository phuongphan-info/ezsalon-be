import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './services/health.service';
import { HealthCheckMiddleware } from './middleware/health-check.middleware';

@Module({
  controllers: [HealthController],
  providers: [HealthService, HealthCheckMiddleware],
  exports: [HealthService],
})
export class HealthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HealthCheckMiddleware)
      .forRoutes({ path: 'health*', method: RequestMethod.ALL });
  }
}