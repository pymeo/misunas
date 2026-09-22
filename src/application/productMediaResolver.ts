import { CREATORS_API_CACHE_TTL_MS as CONFIGURED_CREATORS_API_CACHE_TTL_MS } from '@/config/amazonCreators';
import { AMAZON_CREATORS_API_ENABLED } from '@/config/media';
import { getAmazonSnapshotEntry } from '@/data/amazonMediaSnapshot';
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

/**
 * TTL de la respuesta de Creators API: 24 h, el máximo que autoriza la tabla
 * oficial de caching de Amazon para Images/ItemInfo/DetailPageURL (Offers
 * solo permite 1 h, y por eso no pedimos precios). La constante vive en
 * `src/config/amazonCreators.ts`; se reexporta aquí porque este módulo era
 * su origen histórico y los consumidores (y los tests) la importan de aquí.
 */
export const CREATORS_API_CACHE_TTL_MS = CONFIGURED_CREATORS_API_CACHE_TTL_MS;

/**
 * Abstracción de caché de Creators API. La caché DURABLE que usa el build es
 * el snapshot de `src/data/generated/amazon-media-snapshot.json` (ver
 * `src/data/amazonMediaSnapshot.ts`), regenerado por `npm run amazon:sync`.
 * Esta interfaz sigue siendo el contrato para cachés de proceso —
 * `InMemoryCreatorsApiCache` la implementa y la usa el propio sync para no
 * reconsultar un ASIN ya resuelto dentro de la misma ejecución.
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
 * Provider de Amazon Creators API.
 *
 * Deliberadamente SÍNCRONO. La llamada real a Amazon ocurre antes del build
 * (`npm run amazon:sync`), que deja el resultado en un snapshot local; aquí
 * solo se consulta ese snapshot en memoria. Esa decisión es lo que permite
 * que `ProductVisual`, `ProductCard`, `ProductComparison`,
 * `EditorialTopPicks` y `Recommender` sigan siendo síncronos y que las
 * páginas sigan siendo `prerender = true`: el SEO estático se mantiene y una
 * caída de Amazon no puede devolver un 500, porque en tiempo de respuesta no
 * se habla con Amazon.
 *
 * Tres condiciones para devolver una imagen, en este orden:
 *  1. `AMAZON_CREATORS_API_ENABLED` activo (si no, ni se mira el snapshot).
 *  2. Hay una entrada fresca para el ASIN del producto (`getAmazonSnapshotEntry`
 *     ya descarta las que superan la TTL de 24 h).
 *  3. La entrada corresponde a ESTE producto (`productId`), no solo al mismo
 *     ASIN — cinturón y tirantes contra un snapshot desincronizado del
 *     catálogo.
 */
export const creatorsApiMediaProvider: MediaProvider = {
  id: 'creators-api',
  resolve(product) {
    if (!AMAZON_CREATORS_API_ENABLED) return null;
    const entry = getAmazonSnapshotEntry(product.asin);
    if (!entry) return null;
    if (entry.productId !== product.id) return null;
    return entry.media;
  },
};

/**
 * Variantes oficiales para la pequeña galería de la ficha individual. Vacío
 * mientras no haya snapshot fresco: la galería desaparece sin dejar hueco.
 * No se usa en grids ni comparativas — ahí solo la principal, para no
 * multiplicar peticiones de imagen.
 */
export function getAmazonImageVariants(
  product: Product,
): { url: string; width: number; height: number }[] {
  if (!AMAZON_CREATORS_API_ENABLED) return [];
  const entry = getAmazonSnapshotEntry(product.asin);
  if (!entry || entry.productId !== product.id) return [];
  return entry.variants;
}

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
