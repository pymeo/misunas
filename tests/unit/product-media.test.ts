import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  creatorsApiMediaProvider,
  getProductMedia,
} from '@/application/productMediaResolver';
import { getMediaEntries, PRODUCT_MEDIA } from '@/data/productMedia';
import { PRODUCTS } from '@/data/products';
import { productMediaSchema } from '@/domain/productMedia';

const findProduct = (id: string) => {
  const product = PRODUCTS.find((candidate) => candidate.id === id);
  if (!product) throw new Error(`Producto de prueba no encontrado: ${id}`);
  return product;
};

describe('productMediaSchema', () => {
  const base = {
    productId: 'demo-product',
    sourceType: 'brand_official' as const,
    sourcePage: 'https://example.com/product',
    exactProductMatch: true,
    usageBasis: 'manufacturer_authorized' as const,
    alt: 'Producto de ejemplo',
    status: 'candidate' as const,
  };

  it('acepta una entrada candidate con solo sourcePage', () => {
    expect(() => productMediaSchema.parse(base)).not.toThrow();
  });

  it('rechaza status=approved sin localPath', () => {
    expect(() =>
      productMediaSchema.parse({ ...base, status: 'approved' }),
    ).toThrow();
  });

  it('acepta status=approved con localPath bajo /products/', () => {
    expect(() =>
      productMediaSchema.parse({
        ...base,
        status: 'approved',
        localPath: '/products/demo-product/main.webp',
      }),
    ).not.toThrow();
  });

  it('rechaza localPath fuera de /products/', () => {
    expect(() =>
      productMediaSchema.parse({
        ...base,
        status: 'approved',
        localPath: '/img/demo-product.webp',
      }),
    ).toThrow();
  });

  it('rechaza una fuente de marca sin sourcePage ni imageUrl', () => {
    const withoutSourcePage = {
      productId: base.productId,
      sourceType: base.sourceType,
      exactProductMatch: base.exactProductMatch,
      usageBasis: base.usageBasis,
      alt: base.alt,
      status: base.status,
    };
    expect(() => productMediaSchema.parse(withoutSourcePage)).toThrow();
  });

  it('permite editorial/own sin sourcePage', () => {
    expect(() =>
      productMediaSchema.parse({ ...base, sourceType: 'editorial' }),
    ).not.toThrow();
  });
});

describe('getProductMedia (resolver)', () => {
  it('nunca marca nada approved sin que un humano haya añadido un asset local', () => {
    for (const entries of Object.values(PRODUCT_MEDIA))
      for (const entry of entries)
        if (entry.status === 'approved')
          expect(
            existsSync(resolve('public', entry.localPath?.slice(1) ?? '')),
            `${entry.productId}: localPath ${entry.localPath ?? '(vacío)'} no existe en public/`,
          ).toBe(true);
  });

  it('devuelve editorial cuando un producto no tiene ninguna entrada aprobada', () => {
    const product = findProduct('kredioo-torno-profesional-35000-rpm');
    expect(getProductMedia(product)).toEqual({ kind: 'editorial' });
  });

  it('devuelve editorial para un candidato sin aprobar, no la imagen candidata', () => {
    const product = findProduct('ohora-n-cream-cotton');
    expect(getMediaEntries(product.id).length).toBeGreaterThan(0);
    expect(getProductMedia(product)).toEqual({ kind: 'editorial' });
  });

  it('respeta el orden de prioridad entre varias fuentes approved', () => {
    const product = findProduct('kredioo-torno-profesional-35000-rpm');
    const brandOfficial = productMediaSchema.parse({
      productId: product.id,
      sourceType: 'brand_official',
      sourcePage: 'https://example.com/brand',
      localPath: `/products/${product.id}/brand.webp`,
      exactProductMatch: true,
      usageBasis: 'manufacturer_authorized',
      alt: 'Fuente de marca',
      status: 'approved',
    });
    const mediaKit = productMediaSchema.parse({
      productId: product.id,
      sourceType: 'brand_media_kit',
      sourcePage: 'https://example.com/media-kit',
      localPath: `/products/${product.id}/media-kit.webp`,
      exactProductMatch: true,
      usageBasis: 'manufacturer_media_kit',
      alt: 'Media kit',
      status: 'approved',
    });
    const original = PRODUCT_MEDIA[product.id];
    PRODUCT_MEDIA[product.id] = [brandOfficial, mediaKit];
    try {
      const resolved = getProductMedia(product);
      expect(resolved.kind).toBe('image');
      expect(resolved.kind === 'image' && resolved.media.sourceType).toBe(
        'brand_media_kit',
      );
    } finally {
      PRODUCT_MEDIA[product.id] = original ?? [];
    }
  });

  it('el provider de Creators API está preparado pero inactivo (siempre null hoy)', () => {
    const product = findProduct('ohora-n-cream-cotton');
    expect(creatorsApiMediaProvider.resolve(product)).toBeNull();
  });
});

describe('catálogo de media', () => {
  it('toda entrada de PRODUCT_MEDIA referencia un producto real del catálogo', () => {
    for (const [productId, entries] of Object.entries(PRODUCT_MEDIA)) {
      expect(
        PRODUCTS.some((product) => product.id === productId),
        `productMedia.ts referencia un productId inexistente: ${productId}`,
      ).toBe(true);
      for (const entry of entries) expect(entry.productId).toBe(productId);
    }
  });

  it('ninguna entrada de investigación está aprobada sin asset local (todavía)', () => {
    const approved = Object.values(PRODUCT_MEDIA)
      .flat()
      .filter((entry) => entry.status === 'approved');
    for (const entry of approved) expect(entry.localPath).toBeDefined();
  });
});
