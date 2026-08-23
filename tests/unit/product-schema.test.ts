import { describe, expect, it } from 'vitest';
import { productSchema } from '@/domain/product';
import { SAMPLE_PRODUCTS } from '@/data/products.sample';

describe('productSchema', () => {
  it('validates every development fixture', () => {
    for (const product of SAMPLE_PRODUCTS)
      expect(productSchema.parse(product)).toEqual(product);
  });

  it('rejects invalid slugs and inverted claimed duration', () => {
    const candidate = {
      ...SAMPLE_PRODUCTS[0],
      slug: 'No válido',
      claimedDurationMin: 20,
      claimedDurationMax: 5,
    };
    expect(productSchema.safeParse(candidate).success).toBe(false);
  });
});
