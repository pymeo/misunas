import type { Product } from '@/domain/product';

/**
 * Única política que decide si una ficha de producto es apta para
 * indexación (sitemap + `noindex` en la vista). Determinista: nunca depende
 * de cabeceras de la petición (user-agent, IP, etc.), solo de datos del
 * catálogo. `seoIndexable` es la allowlist editorial explícita
 * (`src/data/products.ts`); esta función además exige que la ficha esté
 * realmente publicada (`active` y `editorialStatus: 'approved'`), para que
 * retirar o despublicar un producto lo saque de la indexación aunque nadie
 * recuerde tocar `seoIndexable`.
 */
export function isProductSeoIndexable(product: Product): boolean {
  return (
    product.active &&
    product.editorialStatus === 'approved' &&
    product.seoIndexable
  );
}
