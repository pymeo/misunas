import { describe, expect, it } from 'vitest';
import { buildAmazonAffiliateUrl } from '@/application/affiliate';
import { AMAZON_CONFIG } from '@/config/site';
import { PRODUCTS } from '@/data/products';

/**
 * Cobertura catálogo-completo de lo que valida `npm run affiliate:audit`
 * (Fase 3): cada producto activo y afiliable debe producir un enlace de
 * Amazon.es limpio, con nuestro tag y sin parámetros sobrantes. El script
 * es el runner legible para CI; este test es la protección de regresión
 * automática sobre el mismo contrato.
 */
describe('catálogo: todo producto activo y afiliable produce un enlace de Amazon limpio', () => {
  const activeEligible = PRODUCTS.filter(
    (product) =>
      product.active &&
      product.editorialStatus === 'approved' &&
      product.affiliateEligible,
  );

  it('hay al menos un producto activo y afiliable (el catálogo no está vacío)', () => {
    expect(activeEligible.length).toBeGreaterThan(0);
  });

  it.each(activeEligible.map((product) => [product.id, product] as const))(
    '%s genera un enlace válido',
    (_id, product) => {
      const href = buildAmazonAffiliateUrl(product);
      expect(
        href,
        `${product.id}: no se pudo construir un enlace`,
      ).not.toBeNull();
      const url = new URL(href ?? '');
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('www.amazon.es');
      expect(url.searchParams.get('tag')).toBe(AMAZON_CONFIG.affiliateTag);
      expect([...url.searchParams.keys()]).toEqual(['tag']);
      expect(href).not.toMatch(/localhost|127\.0\.0\.1/);
    },
  );

  it('ningún producto activo/aprobado se queda sin ASIN ni amazonUrl', () => {
    for (const product of activeEligible)
      expect(
        Boolean(product.asin) || Boolean(product.amazonUrl),
        product.id,
      ).toBe(true);
  });
});
