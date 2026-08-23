import { describe, expect, it } from 'vitest';
import {
  recommendProducts,
  RECOMMENDATION_RULES,
} from '@/application/recommendation';
import { SAMPLE_PRODUCTS } from '@/data/products.sample';

describe('recommendProducts', () => {
  it('is deterministic, capped at three and returns understandable reasons', () => {
    const answers = {
      style: 'francesa',
      priority: 'facilidad',
      lamp: 'comprar',
      nailType: 'normal',
      waterExposure: 'media',
    } as const;
    const first = recommendProducts(SAMPLE_PRODUCTS, answers);
    const second = recommendProducts(SAMPLE_PRODUCTS, answers);
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(first[0]?.product.id).toBe('sample-french-kit');
    expect(first[0]?.reasons).toContain('Incluye lámpara para empezar');
  });

  it('keeps weights in a single exported rules object', () => {
    expect(
      Object.values(RECOMMENDATION_RULES).every((weight) => weight > 0),
    ).toBe(true);
  });
});
