# E2E Testing Guide

This guide shows you how to run End-to-End tests for the EZ Salon API. **All tests run inside Docker containers**.

## Prerequisites

- Docker and Docker Compose installed
- Make sure Docker is running

## Option 1: Using the E2E Test Script

### Quick Start
```bash
# Run all E2E tests
./scripts/e2e-test.sh

# Or specify test type
./scripts/e2e-test.sh all
```

### Available Commands
```bash
# Run specific test suites
./scripts/e2e-test.sh cache      # Cache system tests only
./scripts/e2e-test.sh customers  # Customer API tests only
./scripts/e2e-test.sh auth       # Authentication tests only

# Development modes
./scripts/e2e-test.sh watch      # Watch mode (tests re-run on changes)
./scripts/e2e-test.sh coverage   # Generate coverage report
```

## Option 2: Using Makefile (Simpler)

### Docker Container Management
```bash
make up-d    # Start containers in detached mode
make up      # Start containers with logs
make down    # Stop all containers
make bash    # Access app container shell
```

### Running Tests
```bash
make test-e2e        # Run all E2E tests
make test-e2e-cov    # Run E2E tests with coverage
make test-e2e-watch  # Run E2E tests in watch mode
make test            # Run unit tests
```

## Option 3: Direct Docker Commands

```bash
# Start containers
docker-compose up -d

# Run all E2E tests
docker-compose exec app npm run test:e2e

# Run specific test suites
docker-compose exec app npm run test:e2e:cache
docker-compose exec app npm run test:e2e:customers
docker-compose exec app npm run test:e2e:auth
```

## What Gets Tested

### 🧪 **Cache System Tests** (`cache.e2e-spec.ts`)
- Redis HSET operations
- TTL (Time To Live) functionality
- Cache hit/miss scenarios
- Error handling
- Data persistence

### 👥 **Customer API Tests** (`customers.e2e-spec.ts`)
- CRUD operations (Create, Read, Update, Delete)
- Authentication flows
- Cache integration
- Data validation
- Error responses

### 🔐 **Authentication Tests** (`auth.e2e-spec.ts`)
- Login/Register flows
- JWT token validation
- Cache integration for auth
- Permission testing

## Test Architecture

- **Framework**: Jest + Supertest
- **Environment**: Docker containers
- **Database**: MySQL with test data
- **Cache**: Redis with HSET architecture
- **API**: NestJS REST endpoints

## Troubleshooting

### Containers won't start
```bash
make down
make up-d
```

### Database connection issues
```bash
# Check if database is ready
docker-compose exec app npm run typeorm:check
```

### Redis connection issues
```bash
# Test Redis connection
docker-compose exec redis redis-cli ping
```

### View logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs app
docker-compose logs redis
docker-compose logs db
```

## Performance Notes

- Tests run with `maxWorkers: 1` to avoid database conflicts
- Each test suite cleans up its data
- Redis cache is cleared between test suites
- Tests have 30-second timeout for Docker operations

## Example Output

```
🧪 Starting E2E Tests for EZ Salon API
🐳 Tests will run inside Docker containers
======================================
📋 Checking Docker status...
✅ Docker is running
📋 Checking application containers...
✅ Containers are running
📋 Checking database connection...
✅ Database is ready
📋 Checking Redis connection...
✅ Redis is ready
🧪 Running All E2E Tests inside Docker container...
🎉 E2E Tests completed!
```
