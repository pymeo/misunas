# Tus-Uñas

Base de producción SEO-first para `https://tus-uñas.com` (host técnico canónico `https://xn--tus-uas-8za.com`). Astro prerenderiza el contenido público y Cloudflare Workers ejecuta únicamente rutas dinámicas/API. D1 guarda experiencias y eventos; el contenido editorial y el catálogo verificado viven en Git.

## Arquitectura

- `src/domain`: modelos y puertos (`ProductRepository`, `WearReportRepository`, `EventRepository`).
- `src/application`: scoring, cálculos, estadísticas, JSON-LD, afiliación y handlers HTTP.
- `src/infrastructure`: Drizzle/D1, repositorios, tracking y rate limiting sustituible.
- `src/content`: colecciones editoriales versionadas; D1 nunca contiene HTML editorial.
- `src/components`, `layouts`, `pages`: HTML prerenderizado e islas vanilla solo donde aportan interacción.
- `migrations`: esquema D1 versionado.

Los cuatro productos SAMPLE solo aparecen con `import.meta.env.DEV`; el build de producción no los recomienda ni publica. No hay precios manuales, scraping ni datos de valoración ficticios.

## Desarrollo

Con Docker (no requiere Node en el host):

```sh
docker compose up --build
```

Abre `http://localhost:4321/es/`. Sin Docker requiere Node 22.12+ (recomendado Node 24):

```sh
npm ci
npm run dev
```

Comandos principales: `make dev`, `make build`, `make test`, `make lint`, `make format`, `make cf-dev` y `make deploy`.

## D1 y Cloudflare

La configuración D1 queda comentada en `wrangler.jsonc` porque todavía no existe un `database_id` real. El comando siguiente pide a Wrangler que añada automáticamente el binding `DB` con el ID devuelto. Si tu sesión de Wrangler no actualiza el archivo, usa el bloque comentado como plantilla y pega el ID real; nunca uses uno ficticio.

```sh
npx wrangler login
npx wrangler d1 create tus-unas --binding DB --location weur --update-config
npm run db:migrate:local
npm run db:seed:local
npm run db:migrate:remote
npm run deploy
```

El reset exige la confirmación explícita `npm run db:reset:local -- --yes-local-only` y siempre utiliza `--local`; no existe script de reset remoto.

Configuración no secreta: `AMAZON_AFFILIATE_TAG=tusunas-21` y `AMAZON_MARKETPLACE=es`. Consulta `.env.example`. Para CI o Workers Builds usa `npm ci` y `npm run build`; no se incluye despliegue automático con secretos.
