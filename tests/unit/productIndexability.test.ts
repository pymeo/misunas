import { describe, expect, it } from 'vitest';
import { isProductSeoIndexable } from '@/application/productIndexability';
import { PRODUCTS } from '@/data/products';
import type { Product } from '@/domain/product';

const findProduct = (id: string): Product => {
  const product = PRODUCTS.find((candidate) => candidate.id === id);
  if (!product) throw new Error(`Producto de prueba no encontrado: ${id}`);
  return product;
};

const basePayload: Omit<Product, 'seoIndexable'> = {
  id: 'demo',
  slug: 'demo',
  brand: 'Demo',
  name: 'Demo',
  category: 'unas-semicuradas',
  productType: 'semi_cured_uv',
  styleTags: [],
  useCases: [],
  editorialAngles: [],
  summary: 'Ficha de ejemplo con longitud suficiente para pasar el esquema.',
  considerations: [],
  amazonMarketplace: 'es',
  affiliateEligible: false,
  editorialStatus: 'approved',
  researchStatus: 'pending',
  active: true,
  sample: true,
};

describe('isProductSeoIndexable', () => {
  it('es determinista: la allowlist editorial (seoIndexable) manda', () => {
    expect(isProductSeoIndexable({ ...basePayload, seoIndexable: true })).toBe(
      true,
    );
    expect(isProductSeoIndexable({ ...basePayload, seoIndexable: false })).toBe(
      false,
    );
  });

  it('nunca indexa un producto retirado (active: false), aunque esté en la allowlist', () => {
    expect(
      isProductSeoIndexable({
        ...basePayload,
        seoIndexable: true,
        active: false,
      }),
    ).toBe(false);
  });

  it('nunca indexa un producto no aprobado editorialmente, aunque esté en la allowlist', () => {
    expect(
      isProductSeoIndexable({
        ...basePayload,
        seoIndexable: true,
        editorialStatus: 'candidate',
      }),
    ).toBe(false);
  });

  it('la allowlist inicial son exactamente estos 6 productos reales del catálogo', () => {
    const indexableIds = [
      'beurer-mp62-set-manicura-pedicura',
      'melodysusie-colector-polvo-profesional',
      'ohora-n-cream-cotton',
      'nailog-maze',
      'nailog-meadow',
      'mylee-diva-sin-lampara',
    ];
    for (const id of indexableIds)
      expect(isProductSeoIndexable(findProduct(id)), id).toBe(true);
    const actualIndexable = PRODUCTS.filter(isProductSeoIndexable).map(
      (product) => product.id,
    );
    expect(actualIndexable.sort()).toEqual(indexableIds.sort());
  });

  it('el resto del catálogo sigue noindex por ahora', () => {
    const stillNoindex = [
      'jmeowio-francesa-rosa',
      'kredioo-torno-profesional-35000-rpm',
      'anbeistee-colector-polvo-2000pa',
      'sunseota-impresora-unas-3d-smart',
    ];
    for (const id of stillNoindex)
      expect(isProductSeoIndexable(findProduct(id)), id).toBe(false);
  });
});
