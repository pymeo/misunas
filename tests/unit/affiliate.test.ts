import { describe, expect, it } from 'vitest';
import { buildAmazonAffiliateUrl } from '@/application/affiliate';

describe('buildAmazonAffiliateUrl', () => {
  it('builds a clean amazon.es URL with the centralized tag', () => {
    expect(
      buildAmazonAffiliateUrl({ asin: 'B0ABC12345', amazonMarketplace: 'es' }),
    ).toBe('https://www.amazon.es/dp/B0ABC12345?tag=tusunas-21');
  });

  it('removes incoming query parameters and rejects untrusted hosts', () => {
    expect(
      buildAmazonAffiliateUrl({
        amazonUrl: 'https://www.amazon.es/dp/B0ABC12345?price=19.99&tag=other',
        amazonMarketplace: 'es',
      }),
    ).toBe('https://www.amazon.es/dp/B0ABC12345?tag=tusunas-21');
    expect(
      buildAmazonAffiliateUrl({
        amazonUrl: 'https://example.com/product',
        amazonMarketplace: 'es',
      }),
    ).toBeNull();
  });
});
