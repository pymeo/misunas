/**
 * Configuración de Amazon Creators API — la API vigente del programa de
 * Afiliados, que sustituye a PA-API 5.0 (deprecada el 30 de abril de 2026 y
 * retirada el 15 de mayo de 2026). Autenticación OAuth 2.0 Client
 * Credentials, no AWS SigV4.
 *
 * Este módulo solo contiene constantes públicas del contrato de la API y los
 * NOMBRES de las variables de entorno. Ningún valor de credencial vive aquí
 * ni en ningún otro fichero versionado: ver `readCreatorsApiCredentials`.
 *
 * Fuentes (documentación oficial vigente, consultada 2026-09-22):
 *  - https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl
 *  - https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/get-items
 *  - https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/best-programming-practices
 */

/**
 * Endpoint de Login with Amazon por región de la credencial. La versión la
 * asigna Amazon al generar las credenciales en Associates Central y NO es
 * deducible del marketplace: una credencial europea (v3.2) debe pedir el
 * token a `api.amazon.co.uk` aunque consulte `www.amazon.es`.
 */
export const CREATORS_API_TOKEN_ENDPOINTS = {
  /** Norteamérica. */
  'v3.1': 'https://api.amazon.com/auth/o2/token',
  /** Europa — la que usa Tus-Uñas (Amazon Afiliados España). */
  'v3.2': 'https://api.amazon.co.uk/auth/o2/token',
  /** Lejano Oriente. */
  'v3.3': 'https://api.amazon.co.jp/auth/o2/token',
} as const;

export type CreatorsApiVersion = keyof typeof CREATORS_API_TOKEN_ENDPOINTS;

export const CREATORS_API_VERSIONS = Object.keys(
  CREATORS_API_TOKEN_ENDPOINTS,
) as CreatorsApiVersion[];

export const DEFAULT_CREATORS_API_VERSION: CreatorsApiVersion = 'v3.2';

export const CREATORS_API_GRANT_TYPE = 'client_credentials';
export const CREATORS_API_SCOPE = 'creatorsapi::default';

export const CREATORS_API_GET_ITEMS_URL =
  'https://creatorsapi.amazon/catalog/v1/getItems';

/**
 * Marketplace de Tus-Uñas. Deriva de `AMAZON_CONFIG.marketplace` ('es') en
 * `src/config/site.ts`, que sigue siendo la única fuente de verdad del
 * mercado y del tag de afiliado — aquí solo se traduce al formato de host
 * que exige Creators API (cabecera `x-marketplace` y campo `marketplace`).
 */
export const CREATORS_API_MARKETPLACE_HOSTS = { es: 'www.amazon.es' } as const;

/** Tope duro del contrato de GetItems: 10 ASINs por petición. */
export const CREATORS_API_MAX_ITEM_IDS = 10;

/**
 * Recursos que pedimos. Deliberadamente sin `offersV2`: la tabla oficial de
 * caching solo permite 1 hora para datos de oferta (precio, disponibilidad,
 * descuentos) y este sitio se prerenderiza, así que no podemos garantizar
 * esa frescura. Ver `docs/AMAZON_CREATORS_API.md`.
 */
export const CREATORS_API_RESOURCES = [
  'images.primary.large',
  'images.variants.large',
  'itemInfo.title',
  'itemInfo.byLineInfo',
  'itemInfo.features',
] as const;

/**
 * Hosts de imagen aceptados. Allowlist cerrada a propósito: es el mismo
 * conjunto que debe figurar en `img-src` de `public/_headers`, así que una
 * URL servida desde cualquier otro host se descarta en el sync (y se
 * reporta) en vez de renderizarse y ser bloqueada silenciosamente por la
 * CSP. `m.media-amazon.com` es el host que devuelve la documentación
 * oficial; si Amazon empieza a servir otro, el informe del sync lo dirá y se
 * añade aquí y en la CSP de forma deliberada — nunca con un comodín.
 */
export const AMAZON_IMAGE_HOSTS = ['m.media-amazon.com'] as const;

/**
 * TTL de caché de la respuesta. La tabla oficial de "Best Programming
 * Practices" permite 1 día para Images, ItemInfo, DetailPageURL y
 * BrowseNodes (y solo 1 hora para Offers, que no pedimos). 24h es por tanto
 * el máximo autorizado, no una elección arbitraria.
 */
export const CREATORS_API_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Margen de seguridad antes de `expires_in` para no usar un token caducado. */
export const CREATORS_API_TOKEN_EXPIRY_MARGIN_MS = 60 * 1000;

/** Reintentos para errores transitorios y throttling (no para 4xx definitivos). */
export const CREATORS_API_MAX_RETRIES = 4;
export const CREATORS_API_RETRY_BASE_DELAY_MS = 500;

/** Nombres —no valores— de las variables de entorno de la integración. */
export const CREATORS_API_ENV_VARS = {
  credentialId: 'AMAZON_CREATORS_CREDENTIAL_ID',
  credentialSecret: 'AMAZON_CREATORS_CREDENTIAL_SECRET',
  version: 'AMAZON_CREATORS_VERSION',
  enabled: 'AMAZON_CREATORS_API_ENABLED',
} as const;
