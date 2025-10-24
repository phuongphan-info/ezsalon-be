import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './services/health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Application health check',
    description: 'Returns comprehensive health status of the application and its dependencies'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2025-10-24T15:30:00.000Z' },
        uptime: { type: 'number', example: 3600.5 },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'production' },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'healthy' },
                responseTime: { type: 'number', example: 45 },
                details: { type: 'object' }
              }
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'healthy' },
                responseTime: { type: 'number', example: 12 },
                details: { type: 'object' }
              }
            },
            memory: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'healthy' },
                usage: { type: 'object' }
              }
            },
            disk: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'healthy' },
                usage: { type: 'object' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Application is unhealthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'unhealthy' },
        timestamp: { type: 'string' },
        errors: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async getHealth(@Res() res: Response) {
    const startTime = Date.now();
    const healthStatus = await this.healthService.getHealthStatus();
    const responseTime = Date.now() - startTime;
    
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    if (healthStatus.status === 'unhealthy') {
      return res.status(503).json(healthStatus);
    }
    
    return res.json(healthStatus);
  }

  @Get('simple')
  @ApiOperation({ 
    summary: 'Simple health check',
    description: 'Returns basic OK status for load balancers and simple monitoring'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'OK',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-10-24T15:30:00.000Z' }
      }
    }
  })
  getSimpleHealth(@Res() res: Response) {
    const startTime = Date.now();
    const result = {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
    const responseTime = Date.now() - startTime;
    
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    return res.json(result);
  }

  @Get('live')
  @ApiOperation({ 
    summary: 'Liveness probe',
    description: 'Indicates if the application is running (for Kubernetes liveness probes)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'alive' }
      }
    }
  })
  getLiveness() {
    return { status: 'alive' };
  }

  @Get('ready')
  @ApiOperation({ 
    summary: 'Readiness probe',
    description: 'Indicates if the application is ready to serve traffic (for Kubernetes readiness probes)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ready' },
        checks: { type: 'object' }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Application is not ready'
  })
  async getReadiness(@Res() res: Response) {
    const startTime = Date.now();
    const readinessStatus = await this.healthService.getReadinessStatus();
    const responseTime = Date.now() - startTime;
    
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    if (readinessStatus.status === 'not_ready') {
      return res.status(503).json(readinessStatus);
    }
    
    return res.json(readinessStatus);
  }

  @Get('database')
  @ApiOperation({ 
    summary: 'Database health check',
    description: 'Specific health check for database connectivity and status'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Database is healthy'
  })
  async getDatabaseHealth(@Res() res: Response) {
    const startTime = Date.now();
    const dbHealth = await this.healthService.checkDatabase();
    const responseTime = Date.now() - startTime;
    
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    if (dbHealth.status === 'unhealthy') {
      return res.status(503).json(dbHealth);
    }
    
    return res.json(dbHealth);
  }

  @Get('redis')
  @ApiOperation({ 
    summary: 'Redis health check',
    description: 'Specific health check for Redis connectivity and status'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Redis is healthy'
  })
  async getRedisHealth(@Res() res: Response) {
    const startTime = Date.now();
    const redisHealth = await this.healthService.checkRedis();
    const responseTime = Date.now() - startTime;
    
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    if (redisHealth.status === 'unhealthy') {
      return res.status(503).json(redisHealth);
    }
    
    return res.json(redisHealth);
  }
}