import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AMAZON_CREATORS_API_ENABLED } from '@/config/media';
import {
  CREATORS_API_CACHE_TTL_MS,
  InMemoryCreatorsApiCache,
  creatorsApiMediaProvider,
  getMediaSrc,
  getProductMedia,
} from '@/application/productMediaResolver';
import { getMediaEntries, PRODUCT_MEDIA } from '@/data/productMedia';
import { PRODUCTS } from '@/data/products';
import {
  productMediaSchema,
  type RemoteProductMedia,
} from '@/domain/productMedia';

const findProduct = (id: string) => {
  const product = PRODUCTS.find((candidate) => candidate.id === id);
  if (!product) throw new Error(`Producto de prueba no encontrado: ${id}`);
  return product;
};

describe('productMediaSchema', () => {
  const base = {
    productId: 'demo-product',
    delivery: 'local' as const,
    sourceType: 'brand_official' as const,
    sourcePage: 'https://example.com/product',
    exactProductMatch: true,
    usageBasis: 'manufacturer_authorized' as const,
    alt: 'Producto de ejemplo',
    status: 'candidate' as const,
    rightsStatus: 'needs_permission' as const,
  };

  it('acepta una entrada local candidate todavía sin localPath (fase de investigación)', () => {
    expect(() => productMediaSchema.parse(base)).not.toThrow();
  });

  it('rechaza local approved sin localPath', () => {
    expect(() =>
      productMediaSchema.parse({
        ...base,
        status: 'approved',
        rightsStatus: 'permission_granted',
      }),
    ).toThrow();
  });

  it('acepta local approved con localPath bajo /products/ y derechos concedidos', () => {
    expect(() =>
      productMediaSchema.parse({
        ...base,
        status: 'approved',
        rightsStatus: 'permission_granted',
        localPath: '/products/demo-product/main.webp',
      }),
    ).not.toThrow();
  });

  it('rechaza localPath fuera de /products/', () => {
    expect(() =>
      productMediaSchema.parse({
        ...base,
        status: 'approved',
        rightsStatus: 'permission_granted',
        localPath: '/img/demo-product.webp',
      }),
    ).toThrow();
  });

  it('rechaza approved cuyo derecho de uso no está confirmado (rightsStatus)', () => {
    expect(() =>
      productMediaSchema.parse({
        ...base,
        status: 'approved',
        rightsStatus: 'permission_requested',
        localPath: '/products/demo-product/main.webp',
      }),
    ).toThrow();
  });

  it('acepta una entrada remote con imageUrl', () => {
    expect(() =>
      productMediaSchema.parse({
        ...base,
        delivery: 'remote',
        sourceType: 'amazon_official',
        usageBasis: 'amazon_affiliate_asset',
        imageUrl: 'https://example.com/amazon-image.jpg',
      }),
    ).not.toThrow();
  });

  it('rechaza remote sin imageUrl', () => {
    expect(() =>
      productMediaSchema.parse({
        productId: base.productId,
        delivery: 'remote',
        sourceType: 'amazon_official',
        sourcePage: base.sourcePage,
        exactProductMatch: true,
        usageBasis: 'amazon_affiliate_asset',
        alt: base.alt,
        status: 'candidate',
        rightsStatus: 'needs_permission',
      }),
    ).toThrow();
  });

  it('acepta remote approved cuando el derecho de uso está concedido', () => {
    expect(() =>
      productMediaSchema.parse({
        ...base,
        delivery: 'remote',
        sourceType: 'amazon_official',
        usageBasis: 'amazon_affiliate_asset',
        imageUrl: 'https://example.com/amazon-image.jpg',
        status: 'approved',
        rightsStatus: 'permission_granted',
      }),
    ).not.toThrow();
  });

  it('rechaza una fuente de marca sin sourcePage ni imageUrl', () => {
    const withoutSourcePage = {
      productId: base.productId,
      delivery: base.delivery,
      sourceType: base.sourceType,
      exactProductMatch: base.exactProductMatch,
      usageBasis: base.usageBasis,
      alt: base.alt,
      status: base.status,
      rightsStatus: base.rightsStatus,
    };
    expect(() => productMediaSchema.parse(withoutSourcePage)).toThrow();
  });

  it('permite editorial/own sin sourcePage', () => {
    expect(() =>
      productMediaSchema.parse({ ...base, sourceType: 'editorial' }),
    ).not.toThrow();
  });

  it('rechaza ugc aprobado: no hay moderación implementada todavía (Fase 8)', () => {
    expect(() =>
      productMediaSchema.parse({
        ...base,
        sourceType: 'ugc',
        usageBasis: 'user_submitted',
        status: 'approved',
        rightsStatus: 'permission_granted',
        localPath: '/products/demo-product/ugc.webp',
      }),
    ).toThrow();
  });

  it('permite ugc candidate, pendiente de moderación', () => {
    expect(() =>
      productMediaSchema.parse({
        ...base,
        sourceType: 'ugc',
        usageBasis: 'user_submitted',
      }),
    ).not.toThrow();
  });
});

describe('getMediaSrc', () => {
  it('usa localPath cuando delivery es local', () => {
    const media = productMediaSchema.parse({
      productId: 'demo',
      delivery: 'local',
      sourceType: 'own',
      usageBasis: 'owned',
      exactProductMatch: true,
      alt: 'x',
      status: 'approved',
      rightsStatus: 'not_required',
      localPath: '/products/demo/main.webp',
    });
    expect(getMediaSrc(media)).toBe('/products/demo/main.webp');
  });

  it('usa imageUrl cuando delivery es remote', () => {
    const media = productMediaSchema.parse({
      productId: 'demo',
      delivery: 'remote',
      sourceType: 'amazon_official',
      usageBasis: 'amazon_affiliate_asset',
      exactProductMatch: true,
      alt: 'x',
      status: 'approved',
      rightsStatus: 'not_required',
      imageUrl: 'https://example.com/img.jpg',
    });
    expect(getMediaSrc(media)).toBe('https://example.com/img.jpg');
  });
});

describe('getProductMedia (resolver)', () => {
  it('nunca marca nada approved sin que un humano haya añadido un asset local (delivery local)', () => {
    for (const entries of Object.values(PRODUCT_MEDIA))
      for (const entry of entries)
        if (entry.status === 'approved' && entry.delivery === 'local')
          expect(
            existsSync(resolve('public', entry.localPath?.slice(1) ?? '')),
            `${entry.productId}: localPath ${entry.localPath ?? '(vacío)'} no existe en public/`,
          ).toBe(true);
  });

  it('devuelve editorial cuando un producto no tiene ninguna entrada aprobada', () => {
    const product = findProduct('kredioo-torno-profesional-35000-rpm');
    expect(getProductMedia(product)).toEqual({ kind: 'editorial' });
  });

  it('devuelve editorial para un candidato sin aprobar, nunca lo trata como aprobado', () => {
    const product = findProduct('ohora-n-cream-cotton');
    expect(getMediaEntries(product.id).length).toBeGreaterThan(0);
    expect(
      getMediaEntries(product.id).every(
        (entry) => entry.status === 'candidate',
      ),
    ).toBe(true);
    expect(getProductMedia(product)).toEqual({ kind: 'editorial' });
  });

  it('devuelve la imagen real (local) cuando existe una entrada local approved', () => {
    const product = findProduct('kredioo-torno-profesional-35000-rpm');
    const local = productMediaSchema.parse({
      productId: product.id,
      delivery: 'local',
      sourceType: 'own',
      usageBasis: 'owned',
      localPath: `/products/${product.id}/main.webp`,
      exactProductMatch: true,
      alt: 'Foto propia',
      status: 'approved',
      rightsStatus: 'not_required',
    });
    const original = PRODUCT_MEDIA[product.id];
    PRODUCT_MEDIA[product.id] = [local];
    try {
      const resolved = getProductMedia(product);
      expect(resolved.kind).toBe('image');
      expect(resolved.kind === 'image' && resolved.media.delivery).toBe(
        'local',
      );
      expect(resolved.kind === 'image' && getMediaSrc(resolved.media)).toBe(
        `/products/${product.id}/main.webp`,
      );
    } finally {
      PRODUCT_MEDIA[product.id] = original ?? [];
    }
  });

  it('devuelve la imagen real (remote) cuando existe una entrada remote approved', () => {
    const product = findProduct('kredioo-torno-profesional-35000-rpm');
    const remote = productMediaSchema.parse({
      productId: product.id,
      delivery: 'remote',
      sourceType: 'amazon_official',
      usageBasis: 'amazon_affiliate_asset',
      imageUrl: 'https://example.com/amazon-image.jpg',
      exactProductMatch: true,
      alt: 'Imagen oficial de Amazon',
      status: 'approved',
      rightsStatus: 'not_required',
    });
    const original = PRODUCT_MEDIA[product.id];
    PRODUCT_MEDIA[product.id] = [remote];
    try {
      const resolved = getProductMedia(product);
      expect(resolved.kind).toBe('image');
      expect(resolved.kind === 'image' && resolved.media.delivery).toBe(
        'remote',
      );
      expect(resolved.kind === 'image' && getMediaSrc(resolved.media)).toBe(
        'https://example.com/amazon-image.jpg',
      );
    } finally {
      PRODUCT_MEDIA[product.id] = original ?? [];
    }
  });

  it('respeta el orden de prioridad entre varias fuentes approved', () => {
    const product = findProduct('kredioo-torno-profesional-35000-rpm');
    const brandOfficial = productMediaSchema.parse({
      productId: product.id,
      delivery: 'local',
      sourceType: 'brand_official',
      sourcePage: 'https://example.com/brand',
      localPath: `/products/${product.id}/brand.webp`,
      exactProductMatch: true,
      usageBasis: 'manufacturer_authorized',
      alt: 'Fuente de marca',
      status: 'approved',
      rightsStatus: 'permission_granted',
    });
    const mediaKit = productMediaSchema.parse({
      productId: product.id,
      delivery: 'local',
      sourceType: 'brand_media_kit',
      sourcePage: 'https://example.com/media-kit',
      localPath: `/products/${product.id}/media-kit.webp`,
      exactProductMatch: true,
      usageBasis: 'manufacturer_media_kit',
      alt: 'Media kit',
      status: 'approved',
      rightsStatus: 'permission_granted',
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
});

describe('creatorsApiMediaProvider (Fase 5, desactivado por defecto)', () => {
  it('el flag AMAZON_CREATORS_API_ENABLED está desactivado por defecto', () => {
    expect(AMAZON_CREATORS_API_ENABLED).toBe(false);
  });

  it('está preparado pero inactivo: siempre resuelve null hoy', () => {
    const product = findProduct('ohora-n-cream-cotton');
    expect(creatorsApiMediaProvider.resolve(product)).toBeNull();
  });

  it('con el flag desactivado, resolve() no realiza ninguna llamada de red', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    try {
      const product = findProduct('ohora-n-cream-cotton');
      expect(creatorsApiMediaProvider.resolve(product)).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('InMemoryCreatorsApiCache', () => {
  const sampleRemoteMedia = productMediaSchema.parse({
    productId: 'demo',
    delivery: 'remote',
    sourceType: 'amazon_official',
    usageBasis: 'amazon_affiliate_asset',
    exactProductMatch: true,
    alt: 'x',
    status: 'approved',
    rightsStatus: 'not_required',
    imageUrl: 'https://example.com/img.jpg',
  }) as RemoteProductMedia;

  it('devuelve null si no hay nada cacheado para ese ASIN', async () => {
    const cache = new InMemoryCreatorsApiCache();
    expect(await cache.get('B000000000')).toBeNull();
  });

  it('devuelve lo cacheado mientras esté dentro de la TTL', async () => {
    const cache = new InMemoryCreatorsApiCache();
    await cache.set('B000000000', sampleRemoteMedia);
    expect(await cache.get('B000000000')).toEqual(sampleRemoteMedia);
  });

  it('expira pasadas ~24h (CREATORS_API_CACHE_TTL_MS)', async () => {
    const cache = new InMemoryCreatorsApiCache();
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000_000);
    await cache.set('B000000000', sampleRemoteMedia);
    nowSpy.mockReturnValue(1_000_000 + CREATORS_API_CACHE_TTL_MS + 1);
    expect(await cache.get('B000000000')).toBeNull();
    nowSpy.mockRestore();
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

  it('ninguna entrada de investigación local está aprobada sin asset (todavía)', () => {
    const approved = Object.values(PRODUCT_MEDIA)
      .flat()
      .filter(
        (entry): entry is Extract<typeof entry, { delivery: 'local' }> =>
          entry.status === 'approved' && entry.delivery === 'local',
      );
    for (const entry of approved) expect(entry.localPath).toBeDefined();
  });

  it('ninguna entrada approved tiene el derecho de uso pendiente de confirmar', () => {
    const approved = Object.values(PRODUCT_MEDIA)
      .flat()
      .filter((entry) => entry.status === 'approved');
    for (const entry of approved)
      expect(['permission_granted', 'not_required']).toContain(
        entry.rightsStatus,
      );
  });
});
