import { AMAZON_CREATORS_API_ENABLED } from '@/config/media';
import { getMediaEntries } from '@/data/productMedia';
import type { Product } from '@/domain/product';
import type { ProductMedia, RemoteProductMedia } from '@/domain/productMedia';

export type ResolvedProductMedia =
  { kind: 'image'; media: ProductMedia } | { kind: 'editorial' };

/**
 * Orden de preferencia entre fuentes ya `approved` para un mismo producto.
 * `ugc` queda deliberadamente fuera: el contenido enviado por usuarias no
 * puede llegar a `approved` todavía (bloqueado a nivel de esquema — ver
 * `productMediaSchema`), así que no tiene sentido priorizarlo aquí hasta que
 * exista un flujo de moderación real (Fase 8).
 */
const SOURCE_PRIORITY: ProductMedia['sourceType'][] = [
  'amazon_official',
  'brand_media_kit',
  'brand_pim',
  'brand_official',
  'own',
];

export interface MediaProvider {
  readonly id: string;
  resolve(product: Product): ProductMedia | null;
}

interface CreatorsApiCacheEntry {
  media: RemoteProductMedia;
  /** Epoch ms en que se guardó; se compara con la TTL para decidir frescura. */
  cachedAt: number;
}

/** ~24h: Amazon no autoriza descargar sus imágenes, solo enlazarlas dinámicamente, así que lo cacheable es la respuesta (URL + metadatos), no el fichero — y por poco tiempo, por si la URL rota o caduca. */
export const CREATORS_API_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Abstracción de caché para el futuro cliente de Amazon Creators API. Hoy
 * solo existe `InMemoryCreatorsApiCache` (usada en tests); una
 * implementación real (KV de Cloudflare, o un snapshot JSON regenerado por
 * un script de build) puede sustituirla sin tocar `creatorsApiMediaProvider`
 * ni ningún componente de UI.
 */
export interface CreatorsApiCache {
  get(asin: string): Promise<RemoteProductMedia | null>;
  set(asin: string, media: RemoteProductMedia): Promise<void>;
}

export class InMemoryCreatorsApiCache implements CreatorsApiCache {
  private readonly entries = new Map<string, CreatorsApiCacheEntry>();

  get(asin: string): Promise<RemoteProductMedia | null> {
    const entry = this.entries.get(asin);
    if (!entry) return Promise.resolve(null);
    if (Date.now() - entry.cachedAt > CREATORS_API_CACHE_TTL_MS) {
      this.entries.delete(asin);
      return Promise.resolve(null);
    }
    return Promise.resolve(entry.media);
  }

  set(asin: string, media: RemoteProductMedia): Promise<void> {
    this.entries.set(asin, { media, cachedAt: Date.now() });
    return Promise.resolve();
  }
}

/**
 * Amazon retiró SiteStripe "Image"/"Texto+Imagen" y las Native Shopping Ads
 * a finales de 2023; hoy la única vía oficial de Amazon para imágenes de
 * producto es la Product Advertising API (Creators API), que exige una
 * cuenta de Afiliados ya aprobada con ventas cualificadas — esta cuenta
 * todavía no tiene acceso, y `AMAZON_CREATORS_API_ENABLED` (Fase 5, ver
 * `src/config/media.ts`) está desactivado por defecto.
 *
 * Mientras el flag esté a `false`, `resolve()` no toca la caché ni hace
 * ninguna llamada de red: devuelve `null` de inmediato y `getProductMedia`
 * cae al resto de fuentes / fallback editorial, exactamente igual que hoy.
 *
 * Cuando haya acceso, la integración real puede tomar dos formas sin romper
 * este contrato (misma firma `MediaProvider`, ninguna UI cambia):
 *  1. Un script de build (como `scripts/media-audit.ts`) que llama a la API,
 *     usa una implementación real de `CreatorsApiCache` para no reconsultar
 *     el mismo ASIN en <24h, y escribe el resultado en
 *     `src/data/productMedia.ts` como una entrada `delivery: 'remote'` más
 *     — coherente con que el resto del catálogo ya es 100% estático.
 *     Recomendado, dado que el sitio se prerenderiza (`prerender = true` en
 *     casi todas las páginas).
 *  2. Que `resolve()` pase a ser async y llame a la API en el momento del
 *     build de cada página; en ese caso los consumidores síncronos de
 *     `getProductMedia` (ProductVisual, ProductCard, ProductComparison,
 *     EditorialTopPicks, Recommender) tendrían que volverse async también.
 * En ambos casos, la URL debe venir siempre de la respuesta oficial de la
 * API — nunca construirse a mano a partir del ASIN (p. ej.
 * `m.media-amazon.com/...`) — y nunca se descarga el fichero para
 * autoalojarlo (eso violaría el Operating Agreement de Amazon).
 */
export const creatorsApiMediaProvider: MediaProvider = {
  id: 'creators-api',
  resolve() {
    if (!AMAZON_CREATORS_API_ENABLED) return null;
    // TODO(creators-api): cuando existan credenciales, sustituir esta rama
    // (o el script de build que la alimente) por la llamada real más una
    // lectura de `CreatorsApiCache`. Hasta entonces sigue devolviendo null
    // a propósito: no hay llamadas falsas ni URLs construidas a mano.
    return null;
  },
};

/**
 * URL/ruta que debe recibir `<img src>`, sea cual sea el `delivery` —
 * `ProductVisual`/`ProductImage` no necesitan saber si vino de un archivo
 * autoalojado o de una fuente remota autorizada.
 */
export function getMediaSrc(media: ProductMedia): string {
  return media.delivery === 'local' ? (media.localPath ?? '') : media.imageUrl;
}

export function getProductMedia(product: Product): ResolvedProductMedia {
  const fromCreatorsApi = creatorsApiMediaProvider.resolve(product);
  if (fromCreatorsApi && fromCreatorsApi.status === 'approved')
    return { kind: 'image', media: fromCreatorsApi };

  const approved = getMediaEntries(product.id).filter(
    (entry) => entry.status === 'approved',
  );
  for (const sourceType of SOURCE_PRIORITY) {
    const match = approved.find((entry) => entry.sourceType === sourceType);
    if (match) return { kind: 'image', media: match };
  }
  return { kind: 'editorial' };
}
