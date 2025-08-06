up:
	docker-compose up --remove-orphans
up-d:
	docker-compose up -d --remove-orphans
build:
	docker-compose build --no-cache --force-rm
install:
	docker-compose run app npm install
down:
	docker-compose down
bash:
	docker-compose exec app bash
seed-all:
	docker-compose exec app npm run seed:all
seed-permissions:
	docker-compose exec app npm run seed:permissions
seed-users:
	docker-compose exec app npm run seed:users
seed-products:
	docker-compose exec app npm run seed:products
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
test-e2e-products:
	docker-compose exec app npm run test:e2e:products
