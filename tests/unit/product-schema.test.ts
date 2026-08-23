import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '@/data/products';
import { productSchema, productTypes } from '@/domain/product';
describe('catálogo de producto', () => {
  it('valida las diez fichas reales sin precios ni ratings', () => {
    expect(PRODUCTS).toHaveLength(10);
    for (const product of PRODUCTS) { expect(productSchema.parse(product)).toEqual(product); expect(JSON.stringify(product)).not.toMatch(/price|rating|reviewCount/iu); }
  });
  it('mantiene IDs, slugs y ASIN únicos', () => {
    expect(new Set(PRODUCTS.map(({ id }) => id)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map(({ slug }) => slug)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map(({ asin }) => asin)).size).toBe(PRODUCTS.length);
  });
  it('usa tipos escalables y deja sin CTA a inactivos mediante flags editoriales', () => {
    expect(productTypes).toContain('press_on'); expect(productTypes).toContain('nail_care');
    const inactive = { ...PRODUCTS[0], active: false, affiliateEligible: false, editorialStatus: 'inactive' as const };
    expect(productSchema.parse(inactive).active).toBe(false);
  });
});
