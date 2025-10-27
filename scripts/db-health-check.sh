#!/bin/bash

# Database Health Check Script
# Usage: ./scripts/db-health-check.sh

echo "🔍 Checking database health..."

# Check if Docker containers are running
echo "📦 Checking containers..."
if ! docker-compose ps | grep -q "mysql.*Up"; then
    echo "❌ MySQL container is not running!"
    echo "💡 Try: make up-d"
    exit 1
fi

# Check if database exists
echo "🗄️ Checking database existence..."
DB_EXISTS=$(docker-compose exec mysql mysql -u root -ppassword -e "SHOW DATABASES LIKE 'ezsalon';" | wc -l)
if [ "$DB_EXISTS" -lt 2 ]; then
    echo "❌ Database 'ezsalon' does not exist!"
    echo "💡 Try: make db-setup"
    exit 1
fi

# Check migrations table
echo "🔄 Checking migrations..."
MIGRATIONS_EXIST=$(docker-compose exec mysql mysql -u root -ppassword ezsalon -e "SHOW TABLES LIKE 'migrations';" | wc -l)
if [ "$MIGRATIONS_EXIST" -lt 2 ]; then
    echo "⚠️  Migrations table not found - database may not be initialized"
    echo "💡 Try: make migration-run"
else
    echo "✅ Migrations table exists"
fi

# Check key tables
echo "📋 Checking key tables..."
TABLES=("users" "roles" "permissions" "salons" "customers" "plans")
for table in "${TABLES[@]}"; do
    TABLE_EXISTS=$(docker-compose exec mysql mysql -u root -ppassword ezsalon -e "SHOW TABLES LIKE '$table';" | wc -l)
    if [ "$TABLE_EXISTS" -lt 2 ]; then
        echo "❌ Table '$table' is missing!"
    else
        echo "✅ Table '$table' exists"
    fi
done

# Check volume status
echo "💾 Checking Docker volumes..."
if docker volume ls | grep -q "mysql_data"; then
    echo "✅ MySQL data volume exists"
    VOLUME_SIZE=$(docker system df -v | grep mysql_data | awk '{print $3}')
    echo "📊 Volume size: $VOLUME_SIZE"
else
    echo "❌ MySQL data volume is missing!"
fi

# Connection test
echo "🔌 Testing database connection..."
if docker-compose exec app npm run migration:show > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
fi

echo "🎯 Health check completed!"