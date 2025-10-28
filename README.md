<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

EZSalon

## Deployment (Production)

For production we do NOT run MySQL inside the application compose stack. Instead, point the app to an external managed MySQL (RDS, Cloud SQL, etc.). A separate compose file `docker-compose.prod.yml` is provided.

### Files Added
* `docker-compose.prod.yml` – production services (app + optional redis profile, no MySQL)
* `.env.production.example` – template for required environment variables
* New Makefile targets: `make build-prod`, `make up-prod`, `make down-prod`, `make bash-prod`

### Usage
1. Copy `.env.production.example` to `.env.production` and fill in real secrets.
2. Build the image:
  ```bash
  make build-prod
  ```
3. Start the app (without Redis):
  ```bash
  make up-prod
  ```
4. Start the app with an embedded Redis (for testing only):
  ```bash
  docker compose -f docker-compose.prod.yml --profile with-redis up -d
  ```
5. Exec into the running container:
  ```bash
  make bash-prod
  ```

### Required Environment Variables
Provide these via `.env.production` or your orchestrator (Kubernetes secrets, ECS task defs, etc.):

| Variable | Description |
|----------|-------------|
| DATABASE_HOST | External MySQL host |
| DATABASE_PORT | MySQL port (default 3306) |
| DATABASE_USERNAME | MySQL user |
| DATABASE_PASSWORD | MySQL password |
| DATABASE_NAME | Database name (ezsalon) |
| REDIS_HOST | Redis host (if used) |
| REDIS_PORT | Redis port (default 6379) |
| JWT_SECRET | Secure JWT secret |
| STRIPE_SECRET_KEY | Live Stripe secret key |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret |

If Redis is managed externally remove the redis service and just set `REDIS_HOST`/`REDIS_PORT`.

### Migration & Seeding in Production
Run migrations after deploy (do NOT run seeds automatically in production unless intentional):
```bash
docker compose -f docker-compose.prod.yml exec app npm run migration:run
```

### Notes
* The development compose file still bundles MySQL + Redis for convenience.
* Production image starts with `npm run start:prod` and does NOT reinstall dependencies at runtime.
* Remove bind mounts for deterministic builds.
* Adjust health checks and observability separately (see `docs/HEALTH_CHECKS.md`).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
