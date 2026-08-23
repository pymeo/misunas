import { describe, expect, it, vi } from 'vitest';
import { handleReviewRequest } from '@/application/api/review-handler';
import { PRODUCTS } from '@/data/products';
import { MemoryRateLimiter } from '@/infrastructure/rate-limit/rate-limiter';
import { StaticProductRepository } from '@/infrastructure/repositories/static-product-repository';
const valid = {
  productId: PRODUCTS[0]?.id,
  rating: 4,
  title: 'Una experiencia útil',
  body: 'La utilicé siguiendo las instrucciones y comparto una experiencia suficientemente detallada.',
  recommend: true,
};
describe('review endpoint handler', () => {
  it('crea siempre pending sin datos personales', async () => {
    const create = vi.fn();
    const response = await handleReviewRequest(
      new Request('https://example.test/api/reviews', {
        method: 'POST',
        body: JSON.stringify(valid),
      }),
      {
        reviews: { create, listApproved: vi.fn() },
        products: new StaticProductRepository(PRODUCTS),
        rateLimiter: new MemoryRateLimiter(),
      },
    );
    expect(response.status).toBe(201);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      status: 'pending',
      approvedAt: null,
    });
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('email');
  });
  it('rechaza spam con URL', async () => {
    const create = vi.fn();
    const response = await handleReviewRequest(
      new Request('https://example.test/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          ...valid,
          body: 'Consulta mi experiencia completa en https://spam.example porque aquí no quiero contarla.',
        }),
      }),
      {
        reviews: { create, listApproved: vi.fn() },
        products: new StaticProductRepository(PRODUCTS),
        rateLimiter: new MemoryRateLimiter(),
      },
    );
    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
