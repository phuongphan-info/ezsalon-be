up:
	docker-compose up --remove-orphans
build:
	docker-compose build --no-cache --force-rm
install:
	docker-compose run app npm install
down:
	docker-compose down
bash:
	docker-compose exec app bash
