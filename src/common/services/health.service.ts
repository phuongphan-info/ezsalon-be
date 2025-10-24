import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as os from 'os';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  details?: any;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    redis?: HealthCheckResult;
    memory: HealthCheckResult;
    disk: HealthCheckResult;
  };
  errors?: string[];
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks = await this.performAllHealthChecks();
    
    // Determine overall status
    const hasUnhealthy = Object.values(checks).some(check => check.status === 'unhealthy');
    const hasDegraded = Object.values(checks).some(check => check.status === 'degraded');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    const errors = Object.entries(checks)
      .filter(([, check]) => check.error)
      .map(([name, check]) => `${name}: ${check.error}`);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      ...(errors.length > 0 && { errors }),
    };
  }

  async getReadinessStatus() {
    const checks = await this.performCriticalHealthChecks();
    const isReady = Object.values(checks).every(check => check.status !== 'unhealthy');
    
    return {
      status: isReady ? 'ready' : 'not_ready',
      checks,
    };
  }

  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      // Test with a simple query
      await this.dataSource.query('SELECT 1');
      
      // Check if migrations table exists (indicates proper setup)
      const migrationsExist = await this.dataSource.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'migrations'"
      );

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          connected: true,
          migrationsTableExists: migrationsExist[0]?.count > 0,
          database: this.dataSource.options.database,
          host: (this.dataSource.options as any).host,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: {
          connected: false,
          database: this.dataSource.options.database,
          host: (this.dataSource.options as any).host,
        },
      };
    }
  }

  async checkRedis(): Promise<HealthCheckResult> {
    // Since Redis is optional in this setup, we'll return a basic check
    // You can enhance this if you have Redis service injected
    try {
      // Basic check - if Redis env vars are set, assume it should be working
      const redisHost = process.env.REDIS_HOST;
      const redisPort = process.env.REDIS_PORT;

      if (!redisHost) {
        return {
          status: 'healthy',
          details: {
            configured: false,
            message: 'Redis not configured',
          },
        };
      }

      // For now, return configured status
      // TODO: Implement actual Redis ping when Redis service is injected
      return {
        status: 'healthy',
        details: {
          configured: true,
          host: redisHost,
          port: redisPort,
          message: 'Redis check not fully implemented',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        details: {
          configured: true,
        },
      };
    }
  }

  checkMemory(): HealthCheckResult {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      // Consider memory unhealthy if usage > 90%
      const status = memoryUsagePercent > 90 ? 'unhealthy' : 
                   memoryUsagePercent > 80 ? 'degraded' : 'healthy';

      return {
        status,
        details: {
          process: {
            rss: this.formatBytes(memoryUsage.rss),
            heapTotal: this.formatBytes(memoryUsage.heapTotal),
            heapUsed: this.formatBytes(memoryUsage.heapUsed),
            external: this.formatBytes(memoryUsage.external),
            arrayBuffers: this.formatBytes(memoryUsage.arrayBuffers),
          },
          system: {
            total: this.formatBytes(totalMemory),
            free: this.formatBytes(freeMemory),
            used: this.formatBytes(usedMemory),
            usagePercent: Math.round(memoryUsagePercent * 100) / 100,
          },
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  checkDisk(): HealthCheckResult {
    try {
      // Get disk usage for current directory
      const stats = fs.statSync('.');
      
      // This is a basic implementation
      // For production, you might want to use a library like 'node-df' for better disk info
      return {
        status: 'healthy',
        details: {
          available: true,
          path: process.cwd(),
          message: 'Basic disk check - consider implementing detailed disk monitoring',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async performAllHealthChecks() {
    const [database, redis, memory, disk] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      Promise.resolve(this.checkMemory()),
      Promise.resolve(this.checkDisk()),
    ]);

    return {
      database: database.status === 'fulfilled' ? database.value : { status: 'unhealthy' as const, error: 'Check failed' },
      redis: redis.status === 'fulfilled' ? redis.value : { status: 'unhealthy' as const, error: 'Check failed' },
      memory: memory.status === 'fulfilled' ? memory.value : { status: 'unhealthy' as const, error: 'Check failed' },
      disk: disk.status === 'fulfilled' ? disk.value : { status: 'unhealthy' as const, error: 'Check failed' },
    };
  }

  private async performCriticalHealthChecks() {
    // Only check critical services for readiness
    const [database] = await Promise.allSettled([
      this.checkDatabase(),
    ]);

    return {
      database: database.status === 'fulfilled' ? database.value : { status: 'unhealthy' as const, error: 'Check failed' },
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}