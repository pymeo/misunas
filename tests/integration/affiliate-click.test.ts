import { describe, expect, it, vi } from 'vitest';
import { handleAffiliateClickRequest } from '@/application/api/affiliate-click-handler';
import { SAMPLE_PRODUCTS } from '@/data/products.sample';
import { MemoryRateLimiter } from '@/infrastructure/rate-limit/rate-limiter';
import { StaticProductRepository } from '@/infrastructure/repositories/static-product-repository';

describe('affiliate click endpoint handler', () => {
  it('records a valid anonymous business event', async () => {
    const track = vi.fn();
    const response = await handleAffiliateClickRequest(
      new Request('https://example.test/api/events/amazon-click', {
        method: 'POST',
        body: JSON.stringify({
          productId: SAMPLE_PRODUCTS[0]?.id,
          sourcePage: '/es/comparativa/',
          component: 'comparison-table',
          position: 1,
        }),
      }),
      {
        tracker: { track },
        products: new StaticProductRepository(SAMPLE_PRODUCTS),
        rateLimiter: new MemoryRateLimiter(),
      },
    );
    expect(response.status).toBe(202);
    expect(track).toHaveBeenCalledWith({
      type: 'amazon_click',
      productId: SAMPLE_PRODUCTS[0]?.id,
      sourcePage: '/es/comparativa/',
      component: 'comparison-table',
      position: 1,
    });
  });

  it('does not record unknown products', async () => {
    const track = vi.fn();
    const response = await handleAffiliateClickRequest(
      new Request('https://example.test/api/events/amazon-click', {
        method: 'POST',
        body: JSON.stringify({
          productId: 'missing',
          sourcePage: '/es/',
          component: 'hero',
        }),
      }),
      {
        tracker: { track },
        products: new StaticProductRepository(SAMPLE_PRODUCTS),
        rateLimiter: new MemoryRateLimiter(),
      },
    );
    expect(response.status).toBe(404);
    expect(track).not.toHaveBeenCalled();
  });
});
