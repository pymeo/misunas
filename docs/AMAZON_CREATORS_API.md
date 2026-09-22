# Amazon Creators API — media oficial de producto

Integración de Tus-Uñas con **Amazon Creators API**, la API vigente del
programa de Afiliados. No es PA-API 5.0: PA-API se deprecó el 30 de abril de
2026 y se retiró el 15 de mayo de 2026, y su autenticación AWS SigV4
(Access Key + Secret Key) fue sustituida por OAuth 2.0 con un par
**Credential ID + Credential Secret** que se genera en Associates Central →
Herramientas → Creators API.

Objetivo: que las fichas y comparativas muestren la **fotografía real** del
producto cuando Amazon la ofrece legalmente, en vez de una ilustración
editorial, sin descargar ni autoalojar ningún binario de Amazon y sin que
una caída de Amazon pueda romper el sitio.

## Decisión de arquitectura: sync antes del build

Casi todas las páginas son `prerender = true`, y eso es deliberado (SEO
estático). La tabla oficial de caching de Amazon autoriza conservar
`Images`, `ItemInfo`, `DetailPageURL` y `BrowseNodes` **1 día**, y solo
**1 hora** los datos de `Offers`.

De ahí las dos consecuencias que definen el diseño:

1. **Se consulta Amazon antes del build, no en cada petición.**
   `npm run amazon:sync` llama a `GetItems`, escribe un snapshot local y el
   build lo lee de forma síncrona. El Worker de Cloudflare nunca habla con
   Amazon, así que Amazon caído no puede producir un 500 en producción — en
   el peor caso el build siguiente no trae imágenes nuevas y se sirve el
   fallback editorial de siempre.

2. **No se publican precios.** 1 hora de caché autorizada es incompatible
   con páginas prerenderizadas, así que no se pide `offersV2` y la CTA sigue
   diciendo “Ver precio actualizado en Amazon”. Tampoco se publican
   descuentos, disponibilidad ni ratings.

El snapshot **no se versiona** (`.gitignore`): un fichero en Git dejaría de
cumplir la regla de 1 día a las 24 horas. `scripts/amazon-prepare.mjs` crea
uno vacío en cualquier checkout limpio (lifecycle `prepare` y `prebuild`),
de modo que `npm ci && npm run build` funciona sin credenciales.

```
scripts/amazon-sync.ts ──> src/data/generated/amazon-media-snapshot.json (no versionado)
                                        │
                                        ▼
                      src/data/amazonMediaSnapshot.ts  (valida esquema + TTL 24 h)
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
   productMediaResolver.ts (síncrono)          amazonProductUrl.ts
   · creatorsApiMediaProvider                  · prefiere detailPageURL oficial
   · getAmazonImageVariants                    · valida ASIN + marketplace + tag
                     │                                     │
                     ▼                                     ▼
   ProductVisual / ProductImage / ProductGallery      AmazonCTA
```

## Capas

| Capa                | Fichero                                                                | Responsabilidad                                                           |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Configuración       | `src/config/amazonCreators.ts`                                         | Endpoints, scope, recursos, TTL, allowlist de hosts, NOMBRES de variables |
| Credenciales        | `src/infrastructure/amazon/credentials.ts`                             | Lectura del entorno con redacción defensiva                               |
| Token               | `src/infrastructure/amazon/tokenProvider.ts`                           | OAuth client credentials + caché + coalescencia                           |
| Cliente HTTP        | `src/infrastructure/amazon/creatorsApiClient.ts`                       | `GetItems`, batching ≤10, retry/backoff, errores parciales vs completos   |
| Contrato            | `src/domain/amazonCreators.ts`                                         | Esquemas Zod de la respuesta de Amazon                                    |
| Mapeo               | `src/application/amazon/creatorsMediaMapper.ts`                        | Amazon → dominio, con verificación de ASIN/host/marketplace               |
| Snapshot            | `src/domain/amazonMediaSnapshot.ts`, `src/data/amazonMediaSnapshot.ts` | Formato y carga con control de frescura                                   |
| Resolución de media | `src/application/productMediaResolver.ts`                              | Prioridad de fuentes y fallback editorial                                 |
| Enlace comercial    | `src/application/amazonProductUrl.ts`                                  | `detailPageURL` oficial con fallback por ASIN                             |
| UI                  | `ProductVisual`, `ProductImage`, `ProductGallery`, `AmazonCTA`         | Render, LCP, CLS, galería                                                 |

## Autenticación

OAuth 2.0 Client Credentials contra Login with Amazon. El endpoint depende
de la **región de la credencial**, que Amazon asigna al generarla y que no se
deduce del marketplace:

| Versión  | Región                      | Endpoint                                 |
| -------- | --------------------------- | ---------------------------------------- |
| v3.1     | Norteamérica                | `https://api.amazon.com/auth/o2/token`   |
| **v3.2** | **Europa (la de Tus-Uñas)** | `https://api.amazon.co.uk/auth/o2/token` |
| v3.3     | Lejano Oriente              | `https://api.amazon.co.jp/auth/o2/token` |

Tus-Uñas usa una credencial **v3.2** para consultar **www.amazon.es**: el
token se pide a `api.amazon.co.uk` y el catálogo a
`https://creatorsapi.amazon/catalog/v1/getItems` con `x-marketplace:
www.amazon.es`.

`grant_type=client_credentials`, `scope=creatorsapi::default`. El token vive
3600 s y **se cachea**: un sync de 34 ASINs hace 1 petición de token y 4 de
`GetItems`, no 34 de cada. Las peticiones concurrentes comparten la misma
promesa en vuelo.

## Dónde viven las credenciales

**Nunca en Git, ni en `wrangler.jsonc`, ni en los Secrets del Worker.**

- **Local**: `.dev.vars` (ignorado por Git). Lo lee `scripts/amazon-sync.ts`.
- **CI**: Secrets del repositorio de GitHub.

No se declaran como Secrets de Cloudflare **a propósito**: la integración es
de tiempo de build, así que el runtime no las necesita nunca y añadirlas allí
solo ampliaría la superficie de exposición sin ninguna ventaja. Si algún día
la integración pasara a runtime, entonces sí deberían ser Secrets del Worker.

```bash
# .dev.vars (nunca se versiona)
AMAZON_CREATORS_API_ENABLED=true
AMAZON_CREATORS_CREDENTIAL_ID=...
AMAZON_CREATORS_CREDENTIAL_SECRET=...
AMAZON_CREATORS_VERSION=v3.2
```

### Quién lee `.dev.vars` (comprobado, no supuesto)

Dos mundos distintos necesitan las variables, y solo uno las recoge solo:

- **`astro build` SÍ lee `.dev.vars`** por su cuenta, a través del platform
  proxy de Wrangler que usa `@astrojs/cloudflare`. Verificado empíricamente:
  con el mismo snapshot de 34 entradas, el build produce 15 imágenes remotas
  en `/es/impresoras-unas-3d/` con `.dev.vars` presente y **0** sin él. No
  hace falta exportar nada al shell.
- **Los scripts ejecutados con `tsx` NO**: no pasan por Astro ni por Wrangler.
  Por eso `scripts/lib/devVars.ts` los carga explícitamente, y se importa como
  **primer import** de `amazon-sync`, `media-audit`, `affiliate-audit` y
  `amazon-freshness-gate`. Tiene que ser el primero porque
  `src/config/media.ts` calcula `AMAZON_CREATORS_API_ENABLED` al evaluarse, y
  ESM evalúa los imports antes del cuerpo del script. Sin esto, `media:audit`
  informaba "Integration enabled: no" y "0 imágenes" mientras el build sí las
  renderizaba.

Una variable ya presente en el entorno gana sobre el fichero: así el CI (que
no tiene `.dev.vars`) y un `VAR=x npm run …` puntual siguen mandando.

`CreatorsApiCredentials` sobrescribe `toJSON` y `toString` para devolver
`[REDACTED]`: un `console.log`, un `JSON.stringify` o una plantilla de error
no pueden volcar el secreto por accidente. Los mensajes de error nombran
variables y códigos HTTP, nunca valores.
`tests/unit/amazon-secret-hygiene.test.ts` recorre `git ls-files` y el
historial buscando formatos de credencial de Amazon/AWS, y falla el build si
aparece alguno.

## Comandos

```bash
npm run amazon:sync              # consulta Amazon y regenera el snapshot
npm run amazon:sync -- --dry-run # informe sin escribir nada
npm run amazon:gate              # bloquea el deploy si el snapshot está caducado
npm run media:audit              # cuántos productos tienen imagen de Amazon y cuántos no
npm run affiliate:audit          # valida los enlaces, incluida la detailPageURL oficial
npm run deploy                   # sync → build → gate → wrangler deploy
```

`npm run deploy` encadena con `&&`, así que un sync fallido o un snapshot
caducado **abortan el despliegue** en vez de publicar datos fuera de
política.

## Frescura y refresco automático

Una página prerenderizada conserva la URL de la imagen mientras no se
reconstruya, así que cumplir la regla de 1 día exige **reconstruir a diario**:
`.github/workflows/amazon-media-refresh.yml` hace sync + deploy cada día. El
workflow se salta a sí mismo si no están configurados sus Secrets, para no
fallar a diario en un repositorio sin credenciales.

Tres defensas independientes contra publicar datos viejos:

1. `loadAmazonMediaSnapshot` **ignora** las entradas con más de 24 h: aunque
   alguien fuerce un build con un snapshot viejo, esos productos caen al
   fallback editorial en vez de mostrar un dato fuera de norma.
2. `npm run amazon:gate` bloquea el despliegue si el snapshot está caducado,
   ausente o vacío con la integración activa.
3. El refresco diario mantiene el snapshot y el HTML publicado por debajo de
   las 24 h.

## Qué se pide y qué no

Recursos solicitados: `images.primary.large`, `images.variants.large`,
`itemInfo.title`, `itemInfo.byLineInfo`, `itemInfo.features`.

- **No** se pide `offersV2` — ver arriba.
- **No** se construye ninguna URL de imagen a mano: siempre la que devuelve
  la API. Si llega de un host que no está en `AMAZON_IMAGE_HOSTS`, la entrada
  se **descarta y se reporta** en vez de renderizarse y morir contra la CSP.
- **No** se descarga ni se hace proxy de los binarios: se enlazan desde
  `m.media-amazon.com`, el único host añadido a `img-src` en
  `public/_headers`.
- **No** se rellena ningún atributo ausente. Sin título de Amazon se usa el
  nombre del catálogo; sin imagen, fallback editorial.
- **No** se hace scraping de amazon.es, ni se llama a la API desde el
  navegador.

## Integridad del emparejamiento

`mapCreatorsApiItem` rechaza en vez de aceptar dudas:

- Los items se emparejan **por ASIN**, nunca por posición (Amazon puede
  devolverlos en otro orden). Un ASIN distinto al pedido se rechaza: no se
  acepta en silencio la fotografía de otro producto.
- `detailPageURL` se acepta solo si es `https`, del host del marketplace
  español y su path contiene el ASIN pedido. Si le falta nuestro `tag`, se
  añade; si falla el host o el ASIN, se descarta y el enlace cae al
  constructor por ASIN.

## Estado de la cuenta: `AssociateNotEligible`

Creators API exige que la cuenta de Afiliados cumpla el requisito de ventas
cualificadas (10 ventas / 30 días; antes eran 3). Mientras no lo cumpla,
`GetItems` responde:

```
HTTP 403 AccessDeniedException
reason:  AssociateNotEligible
message: Your account does not currently meet the eligibility requirements.
```

Comprobado el 2026-09-22 con credenciales v3.2 reales. Es un estado de la
cuenta, no un fallo de la integración, y el sync lo trata como tal: lo informa
sin ambigüedad, **no reintenta** (una decisión de autorización no mejora
reintentando) y **sale con 0**, de modo que el despliegue sigue adelante con el
fallback editorial en vez de quedar bloqueado indefinidamente.

Cómo distinguirlo de un problema real, con lo que imprime el propio sync:

| Síntoma                                | Significado                                                             |
| -------------------------------------- | ----------------------------------------------------------------------- |
| Token 200 + `403 AssociateNotEligible` | Todo correcto salvo la elegibilidad de la cuenta. Esperar.              |
| Token 4xx                              | Credential ID/Secret incorrectos, o región de credencial equivocada.    |
| `400 InvalidAssociate`                 | La credencial no está vinculada a ese partner tag para ese marketplace. |
| `400 FieldValidationFailed`            | Petición mal formada (falta un campo obligatorio).                      |
| `403` sin `reason`                     | Amazon no detalló el motivo; revisar la cuenta en Associates Central.   |

El diagnóstico clave es que `InvalidAssociate` aparece **solo** si se envía un
marketplace distinto: con `www.amazon.es` + `tusunas-21` Amazon valida el
emparejamiento sin quejarse, lo que descarta el tag y el mercado como causa.

## Errores

`GetItems` distingue dos situaciones, y el sync las trata distinto:

- **Fallo parcial**: Amazon responde con items y un array `errors` por ASIN.
  Los buenos entran al snapshot; los fallidos se listan en el informe y usan
  el fallback editorial.
- **Fallo completo del lote**: transporte, HTTP no recuperable, auth o JSON
  ilegible. Si existía una entrada fresca previa para ese ASIN, **se
  reutiliza** en vez de perder la imagen por una caída puntual; si no, se
  reporta.

Reintentos con backoff exponencial y jitter solo para lo transitorio: 429
(respetando `Retry-After`), 500, 502, 503, 504 y fallos de red. Un 400, 404 o
una credencial rechazada no se reintentan. Un 401/403 invalida el token
cacheado y reintenta una vez, por si fue revocado.

Si el sync no obtiene ninguna entrada y ya existía un snapshot fresco, **no
lo sobrescribe** y sale con error.

## Rendimiento e imágenes

- `width`/`height` de la API en todas las imágenes → sin CLS.
- Solo **una** imagen por página puede ser `eager`/`fetchpriority="high"`:
  el pick nº 1 de una categoría o el héroe de una ficha. El resto, `lazy`.
- `object-fit: contain` → nunca se deforma una imagen de proporción distinta.
- Galería de variantes **solo en la ficha individual**. En grids y
  comparativas, únicamente la principal.
- Si la imagen remota falla, `ProductImage` revela la ilustración editorial y
  la galería retira sus miniaturas.

## Ampliar a más categorías

No hay nada por categoría: el snapshot se indexa por ASIN y
`creatorsApiMediaProvider` lo consulta para cualquier producto con ASIN.
Semicuradas, tornos, aspiradores e impresoras ya funcionan con el mismo
código, y un producto nuevo con ASIN válido recibe su media sin tocar nada.

## Documentación oficial consultada (2026-09-22)

- Introducción: <https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction>
- Migración desde PA-API: <https://affiliate-program.amazon.com/creatorsapi/docs/en-us/migrating-to-creatorsapi-from-paapi>
- cURL / endpoints de token: <https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl>
- GetItems: <https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/get-items>
- Recurso Images: <https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/resources/images>
- Caching y buenas prácticas: <https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/best-programming-practices>
