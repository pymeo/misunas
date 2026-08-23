.PHONY: dev build test lint format cf-dev db-migrate-local db-migrate-remote db-seed-local db-reset-local deploy

dev:
	npm run dev

build:
	npm run build

test:
	npm test

lint:
	npm run lint

format:
	npm run format

cf-dev:
	npm run cf-dev

db-migrate-local:
	npm run db:migrate:local

db-migrate-remote:
	npm run db:migrate:remote

db-seed-local:
	npm run db:seed:local

db-reset-local:
	npm run db:reset:local -- --yes-local-only

deploy:
	npm run deploy
