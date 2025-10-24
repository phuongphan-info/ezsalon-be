# Health Check Endpoints

The EzSalon API provides comprehensive health check endpoints for monitoring application status and dependencies.

## Available Endpoints

### 1. **Comprehensive Health Check** - `/health`

Returns detailed health status of the application and all its dependencies.

```bash
curl http://localhost:3000/health
```

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-24T15:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "details": {
        "connected": true,
        "migrationsTableExists": true,
        "database": "ezsalon",
        "host": "mysql"
      }
    },
    "redis": {
      "status": "healthy",
      "responseTime": 12,
      "details": {
        "configured": true,
        "host": "redis",
        "port": "6379"
      }
    },
    "memory": {
      "status": "healthy",
      "details": {
        "process": {
          "rss": "45.2 MB",
          "heapTotal": "18.5 MB",
          "heapUsed": "12.3 MB"
        },
        "system": {
          "total": "8.0 GB",
          "free": "4.2 GB",
          "used": "3.8 GB",
          "usagePercent": 47.5
        }
      }
    },
    "disk": {
      "status": "healthy",
      "details": {
        "available": true,
        "path": "/usr/src/app"
      }
    }
  }
}
```

### 2. **Simple Health Check** - `/health/simple`

Basic OK status for load balancers and simple monitoring tools.

```bash
curl http://localhost:3000/health/simple
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-24T15:30:00.000Z"
}
```

### 3. **Liveness Probe** - `/health/live`

Kubernetes liveness probe endpoint. Indicates if the application is running.

```bash
curl http://localhost:3000/health/live
```

**Response:**
```json
{
  "status": "alive"
}
```

### 4. **Readiness Probe** - `/health/ready`

Kubernetes readiness probe endpoint. Indicates if the application is ready to serve traffic.

```bash
curl http://localhost:3000/health/ready
```

**Response (Ready):**
```json
{
  "status": "ready",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45
    }
  }
}
```

**Response (Not Ready):**
```json
{
  "status": "not_ready",
  "checks": {
    "database": {
      "status": "unhealthy",
      "error": "Connection timeout"
    }
  }
}
```

### 5. **Database Health Check** - `/health/database`

Specific health check for database connectivity.

```bash
curl http://localhost:3000/health/database
```

### 6. **Redis Health Check** - `/health/redis`

Specific health check for Redis connectivity.

```bash
curl http://localhost:3000/health/redis
```

## Health Status Levels

- **`healthy`** - Service is fully operational
- **`degraded`** - Service is operational but with reduced performance
- **`unhealthy`** - Service is not operational

## Response Headers

All health check endpoints include these custom headers:

- `X-Response-Time` - Response time in milliseconds
- `X-Health-Check-Version` - Version of the health check implementation
- `X-Service-Name` - Service identifier (`ezsalon-api`)

## Integration Examples

### Docker Compose Health Check

```yaml
services:
  app:
    # ... other config
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/simple"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Kubernetes Probes

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: ezsalon-api
    # ... other config
    livenessProbe:
      httpGet:
        path: /health/live
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
```

### Load Balancer Configuration

```nginx
# Nginx upstream health check
upstream ezsalon_backend {
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
}

# Health check location
location /health {
    access_log off;
    proxy_pass http://ezsalon_backend/health/simple;
}
```

### Monitoring & Alerting

```bash
# Prometheus scraping example
# Add to prometheus.yml
scrape_configs:
  - job_name: 'ezsalon-health'
    metrics_path: '/health'
    static_configs:
      - targets: ['ezsalon-api:3000']
```

### CI/CD Health Checks

```bash
# In deployment script
echo "Checking application health..."
for i in {1..30}; do
  if curl -f http://localhost:3000/health/ready; then
    echo "✅ Application is ready!"
    break
  fi
  echo "⏳ Waiting for application to be ready... ($i/30)"
  sleep 2
done
```

## Environment Variables

- `LOG_HEALTH_CHECKS` - Set to `true` to enable health check request logging in production
- `NODE_ENV` - Affects logging behavior (development enables verbose logging)

## Troubleshooting

### Common Issues

1. **Database connection failures**
   - Check database connectivity: `make db-check`
   - Verify environment variables
   - Ensure migrations are run: `make migration-run`

2. **Memory warnings**
   - Monitor system resources
   - Check for memory leaks
   - Consider increasing container memory limits

3. **High response times**
   - Database performance issues
   - Network latency
   - Resource constraints

### Debugging

```bash
# Check specific component health
curl http://localhost:3000/health/database
curl http://localhost:3000/health/redis

# Monitor health check logs
docker-compose logs -f app | grep -i health

# Check application metrics
curl http://localhost:3000/health | jq '.checks'
```