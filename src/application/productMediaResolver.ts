import { getMediaEntries } from '@/data/productMedia';
import type { Product } from '@/domain/product';
import type { ProductMedia } from '@/domain/productMedia';

export type ResolvedProductMedia =
  { kind: 'image'; media: ProductMedia } | { kind: 'editorial' };

/** Orden de preferencia entre fuentes ya `approved` para un mismo producto. */
const SOURCE_PRIORITY: ProductMedia['sourceType'][] = [
  'amazon_official',
  'brand_media_kit',
  'brand_pim',
  'brand_official',
  'own',
];

export interface MediaProvider {
  readonly id: string;
  resolve(product: Product): ProductMedia | null;
}

/**
 * Amazon retiró SiteStripe "Image"/"Text+Image" y las Native Shopping Ads a
 * finales de 2023; hoy la única vía oficial de Amazon para imágenes de
 * producto es la Product Advertising API (Creators API), que exige una
 * cuenta de Afiliados ya aprobada con ventas cualificadas — esta cuenta
 * todavía no tiene acceso. Este provider queda preparado (mismo contrato que
 * cualquier otro `MediaProvider`) para el día en que haya acceso: entonces
 * pasará a llamar a la API, cachear el resultado y devolver una
 * `ProductMedia` con `sourceType: 'amazon_official'` sin que haga falta
 * tocar ProductVisual, ProductImage ni ningún componente de UI.
 */
export const creatorsApiMediaProvider: MediaProvider = {
  id: 'creators-api',
  resolve() {
    return null;
  },
};

export function getProductMedia(product: Product): ResolvedProductMedia {
  const fromCreatorsApi = creatorsApiMediaProvider.resolve(product);
  if (fromCreatorsApi && fromCreatorsApi.status === 'approved')
    return { kind: 'image', media: fromCreatorsApi };

  const approved = getMediaEntries(product.id).filter(
    (entry) => entry.status === 'approved',
  );
  for (const sourceType of SOURCE_PRIORITY) {
    const match = approved.find((entry) => entry.sourceType === sourceType);
    if (match) return { kind: 'image', media: match };
  }
  return { kind: 'editorial' };
}
