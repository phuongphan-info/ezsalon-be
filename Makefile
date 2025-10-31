up:
	docker-compose up --remove-orphans
up-d:
	docker-compose up -d --remove-orphans
up-dev:
	docker compose -f docker-compose.dev.yml up --remove-orphans
up-dev-d:
	docker compose -f docker-compose.dev.yml up -d --remove-orphans
up-prod:
	docker compose -f docker-compose.prod.yml up --remove-orphans
up-prod-d:
	docker compose -f docker-compose.prod.yml up -d --remove-orphans
build:
	docker-compose build --no-cache --force-rm
build-prod:
	docker compose -f docker-compose.prod.yml build --no-cache --force-rm
install:
	docker-compose run app npm install
down:
	docker-compose down
down-dev:
	docker compose -f docker-compose.dev.yml down
down-prod:
	docker compose -f docker-compose.prod.yml down
restart:
	docker-compose down
	docker-compose up -d --remove-orphans
bash-dev:
	docker compose -f docker-compose.dev.yml exec app bash || echo "App not running in dev compose"
bash-prod:
	docker compose -f docker-compose.prod.yml exec app bash || echo "App not running in prod compose"
bash:
	docker-compose exec app bash
seed-all:
	docker-compose exec app npm run seed:all
seed-permissions:
	docker-compose exec app npm run seed:permissions
seed-users:
	docker-compose exec app npm run seed:users
migration-run:
	docker-compose exec app npm run migration:run
migration-revert:
	docker-compose exec app npm run migration:revert
migration-show:
	docker-compose exec app npm run migration:show
migration-generate:
	@if [ -z "$(name)" ]; then \
		echo "Usage: make migration-generate name=YourMigrationName"; \
		exit 1; \
	fi
	docker-compose exec app npm run migration:generate src/migrations/$(name)
migration-create:
	@if [ -z "$(name)" ]; then \
		echo "Usage: make migration-create name=YourMigrationName"; \
		exit 1; \
	fi
	docker-compose exec app npm run migration:create src/migrations/$(name)
db-setup:
	docker-compose exec app npm run migration:run
	docker-compose exec app npm run seed:all
db-reset:
	@echo "Warning: This will reset your database. Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	docker-compose exec app npm run migration:revert
	docker-compose exec app npm run migration:run
	docker-compose exec app npm run seed:all
db-backup:
	@echo "Creating database backup..."
	docker-compose exec mysql mysqldump -u root -ppassword ezsalon > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created successfully!"
db-restore:
	@if [ -z "$(file)" ]; then \
		echo "Usage: make db-restore file=backup_file.sql"; \
		exit 1; \
	fi
	@echo "Restoring database from $(file)..."
	docker-compose exec -T mysql mysql -u root -ppassword ezsalon < $(file)
	@echo "Database restored successfully!"
db-check:
	@./scripts/db-health-check.sh
health-check:
	@echo "🏥 Checking application health..."
	@curl -s http://localhost:3001/health | jq '.' || echo "❌ Health check failed - is the application running?"
health-simple:
	@curl -s http://localhost:3001/health/simple || echo "❌ Simple health check failed"
test:
	docker-compose exec app npm test
test-e2e:
	docker-compose exec app npm run test:e2e
test-e2e-watch:
	docker-compose exec app npm run test:e2e:watch
test-e2e-cov:
	docker-compose exec app npm run test:e2e:cov
test-e2e-auth:
	docker-compose exec app npm run test:e2e:auth
test-e2e-auth-customers:
	docker-compose exec app npm run test:e2e:auth-customers
test-e2e-auth-roles:
	docker-compose exec app npm run test:e2e:auth-roles
test-e2e-customers:
	docker-compose exec app npm run test:e2e:customers
test-e2e-plans:
	docker-compose exec app npm run test:e2e:plans
test-e2e-payments:
	docker-compose exec app npm run test:e2e:payments
