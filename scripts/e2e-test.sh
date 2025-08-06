#!/bin/bash

# E2E Test Runner for EZ Salon API (Runs inside Docker containers)
echo "🧪 Starting E2E Tests for EZ Salon API"
echo "🐳 Tests will run inside Docker containers"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
echo -e "${BLUE}📋 Checking Docker status...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if containers are running
echo -e "${BLUE}📋 Checking application containers...${NC}"
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Starting application containers using Makefile...${NC}"
    make up-d
    echo -e "${BLUE}⏳ Waiting for containers to initialize (MySQL can take up to 2 minutes)...${NC}"
    sleep 30
    
    # Show container status
    echo -e "${BLUE}📊 Container Status:${NC}"
    docker-compose ps
fi

# Wait for database to be ready
echo -e "${BLUE}📋 Checking database connection...${NC}"
max_attempts=60
attempt=1
while [ $attempt -le $max_attempts ]; do
    # Check if MySQL service is healthy using docker-compose health status
    if docker-compose ps mysql | grep -q "healthy"; then
        echo -e "${GREEN}✅ Database is ready and healthy${NC}"
        break
    fi
    # Alternative check: try to connect to MySQL directly
    if docker-compose exec -T mysql mysqladmin ping -h localhost --silent > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is ready${NC}"
        break
    fi
    echo -e "${YELLOW}⏳ Waiting for database... (attempt $attempt/$max_attempts)${NC}"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo -e "${RED}❌ Database failed to start within expected time${NC}"
    echo -e "${YELLOW}💡 Try these troubleshooting steps:${NC}"
    echo "   1. Check container logs: docker-compose logs mysql"
    echo "   2. Restart containers: make down && make up-d"
    echo "   3. Check disk space and memory"
    echo "   4. Try: docker-compose exec mysql mysqladmin ping"
    exit 1
fi

# Check Redis connection
echo -e "${BLUE}📋 Checking Redis connection...${NC}"
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis is ready${NC}"
else
    echo -e "${RED}❌ Redis is not responding${NC}"
    exit 1
fi

# Run tests based on argument (all tests run inside Docker container)
case "${1:-all}" in
    "customers")
        echo -e "${BLUE}🧪 Running Customers E2E Tests inside Docker container...${NC}"
        docker-compose exec app npm run test:e2e:customers
        ;;
    "auth")
        echo -e "${BLUE}🧪 Running Auth E2E Tests inside Docker container...${NC}"
        docker-compose exec app npm run test:e2e:auth
        ;;
    "all")
        echo -e "${BLUE}🧪 Running All E2E Tests inside Docker container...${NC}"
        make test-e2e
        ;;
    "watch")
        echo -e "${BLUE}🧪 Running E2E Tests in Watch Mode inside Docker container...${NC}"
        make test-e2e-watch
        ;;
    "coverage")
        echo -e "${BLUE}🧪 Running E2E Tests with Coverage inside Docker container...${NC}"
        make test-e2e-cov
        ;;
    "status"|"check")
        echo -e "${BLUE}📊 Checking system status...${NC}"
        echo ""
        echo -e "${BLUE}Docker Containers:${NC}"
        docker-compose ps
        echo ""
        echo -e "${BLUE}MySQL Health Check:${NC}"
        docker-compose exec mysql mysqladmin ping -h localhost || echo "MySQL not responding"
        echo ""
        echo -e "${BLUE}Redis Health Check:${NC}"
        docker-compose exec redis redis-cli ping || echo "Redis not responding"
        echo ""
        echo -e "${BLUE}App Container Status:${NC}"
        docker-compose exec app npm --version || echo "App container not ready"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid test option: $1${NC}"
        echo -e "${BLUE}Available options:${NC}"
        echo "  customers - Run customers API tests"
        echo "  auth      - Run authentication tests"
        echo "  all       - Run all tests (default)"
        echo "  watch     - Run tests in watch mode"
        echo "  coverage  - Run tests with coverage"
        echo "  status    - Check system status (containers, DB, Redis)"
        echo ""
        echo -e "${BLUE}💡 Alternative: Use Makefile directly:${NC}"
        echo "  make test-e2e     - Run all E2E tests"
        echo "  make test-e2e-cov - Run with coverage"
        echo "  make up-d         - Start containers"
        echo "  make down         - Stop containers"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 E2E Tests completed!${NC}"
