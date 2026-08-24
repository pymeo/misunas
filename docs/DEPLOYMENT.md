# Despliegue a producción

Checklist operativo para publicar Tus-Uñas. Separa lo que se puede automatizar de lo que exige una decisión o credencial humana (cuenta de Cloudflare, DNS, Amazon, Search Console).

## 0. Antes de nada

```sh
npm ci
npm run typecheck && npm run lint && npm run format:check
npm test
npm run catalog:audit && npm run affiliate:audit && npm run media:audit
npm run build
```

Todo debe salir en verde. Si algo falla, no continúes.

## 1. Cloudflare: cuenta, D1 y dominio (manual)

1. `npx wrangler login`.
2. Crear la base D1 remota y que `wrangler` escriba el `database_id` real en `wrangler.jsonc` (hoy solo tiene `database_name`, sin ID inventado):
   ```sh
   npx wrangler d1 create tus-unas --binding DB --location weur --update-config
   ```
3. Aplicar las migraciones. **Local ya está validado en esta tarea** (las 4 migraciones, incluida `0003_business_events_more_types.sql`, se aplicaron sin error sobre `.wrangler/state`). Antes de tocar producción:
   ```sh
   npm run db:migrate:local   # repetir si vuelves a limpiar el estado local
   npm run db:migrate:remote  # ⚠️ toca la base real — no se ha ejecutado en esta tarea
   ```
4. Añadir el dominio en el dashboard de Cloudflare como zona `xn--tus-uas-8za.com` (o `tus-uñas.com`; Cloudflare normaliza IDN automáticamente) y apuntar los NS del registrador a Cloudflare.
5. Enlazar el Worker (`tus-unas`) a esa zona con un **Custom Domain** (Workers & Pages → tus-unas → Settings → Domains & Routes → Add → Custom domain) sobre el host canónico exacto: `xn--tus-uas-8za.com`. Cloudflare emite el certificado TLS automáticamente.

## 2. Redirects a configurar en Cloudflare (manual)

El canonical técnico es un único host: `https://xn--tus-uas-8za.com` (`SITE_URL` en `src/config/site.ts`). Evita que Google indexe variantes:

- **http → https**: activar "Always Use HTTPS" en el dashboard (SSL/TLS → Edge Certificates).
- **www → canónico**: si registras también `www.xn--tus-uas-8za.com` (o el dominio unicode con `www`), añade una Redirect Rule 301 a `https://xn--tus-uas-8za.com/$1`. No lo dejes servir contenido en paralelo.
- **unicode → punycode** (si alguien enlaza `https://tus-uñas.com` directamente): la mayoría de navegadores ya normalizan IDN a punycode al resolver DNS, pero si añades esa zona por separado, redirige también 301 al host punycode para evitar dos orígenes indexables.
- Astro ya fuerza `trailingSlash: 'always'` a nivel de aplicación (`/es` → `/es/`, verificado en local con `wrangler dev`: responde `307` en un único salto, sin loops) — no dupliques esa regla en Cloudflare.

**Verificado en esta tarea** (vía `wrangler dev` local): `/es` → `307` a `/es/`; `/` → `301` a `/es/`; sin cadenas de redirects. Falta verificar el comportamiento real de www/http en el dominio de producción una vez el DNS apunte a Cloudflare — eso no se puede probar desde este entorno.

## 3. Variables de entorno (manual)

Ver `.env.example`. Ninguna es obligatoria para compilar. En Cloudflare (Workers & Pages → tus-unas → Settings → Variables):

| Variable                                                                  | Obligatoria                    | Notas                                                                                          |
| ------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `PUBLIC_CF_WEB_ANALYTICS_TOKEN`                                           | No                             | Activa el beacon de Cloudflare Web Analytics. Sin ella, no se manda el script (no rompe nada). |
| `PUBLIC_GOOGLE_SITE_VERIFICATION`                                         | No                             | Añade el `<meta name="google-site-verification">`. Rellenar tras el paso 5.                    |
| `AMAZON_CREATORS_API_ENABLED`                                             | No                             | Dejar en `false`/sin definir. No hay credenciales todavía — ver `docs/PRODUCT_MEDIA_AUDIT.md`. |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_API_TOKEN` | Solo para tooling de D1 remoto | No las necesita el build ni el Worker en producción.                                           |

No hay secretos en el repositorio ni en `.env.example`.

## 4. Desplegar (manual, solo cuando decidas publicar)

```sh
npm run build
npm run deploy
```

(`deploy` ya encadena `build && wrangler deploy`.) No se ha ejecutado en esta tarea — el enunciado prohíbe desplegar a producción desde aquí.

## 5. Google Search Console (manual, después de publicar)

1. Añadir propiedad de **dominio** (no solo URL-prefix) para `xn--tus-uas-8za.com`.
2. Verificar por DNS (TXT en el registrador) **o** pegar el token en `PUBLIC_GOOGLE_SITE_VERIFICATION` y redesplegar — ya soportado en `SEOHead.astro`.
3. Una vez verificado, enviar `https://xn--tus-uas-8za.com/sitemap.xml` en Search Console → Sitemaps.
4. Revisar Cobertura/Indexación a los pocos días para confirmar que las URLs `noindex` (fichas no listadas, legales) no aparecen como "indexadas por error".

## 6. Qué queda fuera de esta tarea a propósito

- Amazon Creators API: sin credenciales, provider desactivado por diseño (`AMAZON_CREATORS_API_ENABLED=false`). No es un bloqueante de lanzamiento.
- `npm run db:migrate:remote`: no ejecutado (toca D1 real).
- `npm run deploy`: no ejecutado (despliegue real).
- DNS / zona en Cloudflare: no se puede tocar desde este entorno.
- E2E de responsive con navegador real (Playwright): el sandbox de esta tarea no tiene las librerías del sistema que necesita Chromium headless (`libnspr4.so`); la verificación de "sin scroll horizontal" se hizo por inspección de build + análisis estático, no con un navegador real. Ejecuta `npm run test:e2e` en un entorno con esas dependencias antes de confiar ciegamente en el layout a 320–1440px.
