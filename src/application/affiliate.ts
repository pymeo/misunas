import { AMAZON_CONFIG } from '@/config/site';
import type { Product } from '@/domain/product';

const MARKETPLACE_HOSTS = { es: 'www.amazon.es' } as const;

export function buildAmazonAffiliateUrl(
  product: Pick<Product, 'asin' | 'amazonUrl' | 'amazonMarketplace'>,
  affiliateTag = AMAZON_CONFIG.affiliateTag,
): string | null {
  let url: URL;
  if (product.asin) {
    url = new URL(
      `https://${MARKETPLACE_HOSTS[product.amazonMarketplace]}/dp/${product.asin}`,
    );
  } else if (product.amazonUrl) {
    url = new URL(product.amazonUrl);
    if (url.hostname !== MARKETPLACE_HOSTS[product.amazonMarketplace])
      return null;
  } else {
    return null;
  }

  url.protocol = 'https:';
  url.search = '';
  url.hash = '';
  url.searchParams.set('tag', affiliateTag);
  return url.toString();
}
