import { AMAZON_CONFIG } from '@/config/site';
import { AMAZON_CREATORS_API_ENABLED } from '@/config/media';
import { getAmazonSnapshotEntry } from '@/data/amazonMediaSnapshot';
import type { Product } from '@/domain/product';
import { buildAmazonAffiliateUrl } from '@/application/affiliate';
import { validateDetailPageUrl } from '@/application/amazon/creatorsMediaMapper';
import { CREATORS_API_MARKETPLACE_HOSTS } from '@/config/amazonCreators';

/**
 * Resuelve el enlace comercial de un producto prefiriendo la `detailPageURL`
 * oficial que devuelve Creators API para nuestro partnerTag, y cayendo al
 * constructor por ASIN de `buildAmazonAffiliateUrl` en cuanto haya la menor
 * duda.
 *
 * Por qué preferir la URL oficial: es la que Amazon garantiza como canónica
 * para ese ASIN y ese tag, así que sobrevive a redirecciones y a cambios de
 * formato de `/dp/` mejor que una URL montada a mano.
 *
 * Por qué no confiar en ella a ciegas: es un dato de un tercero. Se acepta
 * solo si (a) es https del marketplace español, (b) su path contiene el ASIN
 * que pedimos y (c) lleva nuestro `tag`. Si falta el `tag`, se añade en vez
 * de descartar la URL — una URL oficial sin tag sigue siendo la URL correcta
 * del producto, solo le falta la atribución. Si falla (a) o (b), se descarta:
 * ahí ya no sabemos a qué producto apunta.
 */
export function resolveAmazonProductUrl(
  product: Product,
  affiliateTag = AMAZON_CONFIG.affiliateTag,
): string | null {
  const fallback = buildAmazonAffiliateUrl(product, affiliateTag);
  if (!AMAZON_CREATORS_API_ENABLED) return fallback;

  const entry = getAmazonSnapshotEntry(product.asin);
  if (!entry || entry.productId !== product.id || !entry.detailPageURL)
    return fallback;
  if (!product.asin) return fallback;

  const validated = validateDetailPageUrl(
    entry.detailPageURL,
    product.asin,
    CREATORS_API_MARKETPLACE_HOSTS[product.amazonMarketplace],
  );
  if (!validated) return fallback;

  const url = new URL(validated);
  url.hash = '';
  const existingTag = url.searchParams.get('tag');
  if (existingTag !== affiliateTag) url.searchParams.set('tag', affiliateTag);
  return url.toString();
}
