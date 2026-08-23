# Tus-Uñas

Aplicación SEO-first para `https://tus-uñas.com` (canonical técnico `https://xn--tus-uas-8za.com`). Astro prerenderiza las rutas editoriales; Cloudflare Workers sirve las API y D1 conserva solo datos dinámicos.

## Arquitectura

- `src/domain` y `src/application`: catálogo tipado, recomendador explicable, estadísticas, afiliación, validación y puertos.
- `src/infrastructure`: repositorios Drizzle/D1, rate limiting sustituible y tracking.
- `src/content`: contenido editorial versionado en Git mediante Astro Content Collections.
- `src/data/products.ts`: adaptador editorial de los 10 productos verificados del seed de Amazon.es. No almacena precios, ratings ni imágenes de Amazon.
- `src/components`, `src/layouts`, `src/pages`: HTML prerenderizado e islands vanilla para recomendador, comparador, calculadora y formularios.
- `migrations`: experiencias de duración, opiniones moderadas y eventos comerciales.

Los fixtures SAMPLE viven exclusivamente en `src/data/products.sample.ts` para tests y nunca entran en el catálogo de producción.

## Desarrollo

Con Docker, sin Node en el host:

```sh
docker compose up --build
```

Abre `http://localhost:4321/es/`. Sin Docker requiere Node 22 o superior:

```sh
npm ci
npm run dev
```

Gates: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` y `npm run format:check`.

## D1, migraciones y moderación

El binding local `DB` no necesita un ID inventado. `wrangler.jsonc` declara el nombre y `--update-config` añade el `database_id` real al crear la base remota. Creación y primer despliegue:

```sh
npx wrangler login
npx wrangler d1 create tus-unas --binding DB --location weur --update-config
npm run db:migrate:local
npm run db:migrate:remote
npm run deploy
```

No ejecutes `db:seed:local` en remoto: solo inserta un evento identificado como fixture local. El reset exige `npm run db:reset:local -- --yes-local-only` y no admite modo remoto.

Listar opiniones pendientes:

```sh
npx wrangler d1 execute tus-unas --remote --command "SELECT id, product_id, rating, title, body, recommend, created_at FROM reviews WHERE status = 'pending' ORDER BY created_at ASC"
```

Aprobar o rechazar, siempre con confirmación remota explícita:

```sh
npm run reviews:moderate -- <UUID> approved --remote --yes-remote
npm run reviews:moderate -- <UUID> rejected --remote --yes-remote
```

No existe endpoint administrativo público. Las opiniones nuevas son `pending` y solo las `approved` aparecen en la API pública.

## Configuración

`AMAZON_AFFILIATE_TAG=tusunas-21` y `AMAZON_MARKETPLACE=es` son configuración no secreta centralizada. `PUBLIC_CF_WEB_ANALYTICS_TOKEN` activa el beacon oficial de Cloudflare Web Analytics cuando se proporciona. `.env.example` no contiene secretos.

Cloudflare Workers Builds puede usar `npm ci` y `npm run build`. No hay workflow de despliegue automático ni configuración de custom domain.
