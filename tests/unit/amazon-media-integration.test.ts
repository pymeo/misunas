import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AmazonMediaSnapshotEntry } from '@/domain/amazonMediaSnapshot';
import { PRODUCTS } from '@/data/products';

/**
 * Integración de las capas tal como las consume el build: flag + snapshot +
 * resolver + enlace comercial. Se montan con `vi.doMock` porque tanto el
 * flag como el snapshot son constantes de módulo evaluadas al importar — que
 * es exactamente cómo funcionan en `astro build`.
 */

const found = PRODUCTS.find(
  (candidate) => candidate.id === 'sunseota-impresora-unas-3d-smart',
);
if (!found?.asin) throw new Error('Producto de prueba sin ASIN');
const product = found;
const ASIN = found.asin;

const IMAGE_URL = 'https://m.media-amazon.com/images/I/impresora-sunseota.jpg';

function snapshotEntry(
  overrides: Partial<AmazonMediaSnapshotEntry> = {},
): AmazonMediaSnapshotEntry {
  return {
    asin: ASIN,
    productId: product.id,
    fetchedAt: new Date().toISOString(),
    media: {
      productId: product.id,
      delivery: 'remote',
      sourceType: 'amazon_official',
      imageUrl: IMAGE_URL,
      exactProductMatch: true,
      usageBasis: 'amazon_affiliate_asset',
      alt: 'Impresora de uñas 3D Sunseota',
      width: 500,
      height: 500,
      status: 'approved',
      rightsStatus: 'permission_granted',
    },
    variants: [
      {
        url: 'https://m.media-amazon.com/images/I/v1.jpg',
        width: 500,
        height: 500,
      },
      {
        url: 'https://m.media-amazon.com/images/I/v2.jpg',
        width: 500,
        height: 500,
      },
    ],
    detailPageURL: `https://www.amazon.es/dp/${ASIN}?tag=tusunas-21&psc=1`,
    features: [],
    ...overrides,
  };
}

function mockEnvironment(
  enabled: boolean,
  entries: AmazonMediaSnapshotEntry[],
): void {
  const byAsin = new Map(
    entries.map((item) => [item.asin.toUpperCase(), item]),
  );
  vi.doMock('@/config/media', () => ({
    AMAZON_CREATORS_API_ENABLED: enabled,
  }));
  vi.doMock('@/data/amazonMediaSnapshot', () => ({
    getAmazonSnapshotEntry: (asin: string | undefined) =>
      asin ? (byAsin.get(asin.toUpperCase()) ?? null) : null,
    AMAZON_MEDIA_SNAPSHOT: {
      byAsin,
      snapshot: null,
      staleAsins: [],
      problem: null,
    },
    loadAmazonMediaSnapshot: () => ({
      byAsin,
      snapshot: null,
      staleAsins: [],
      problem: null,
    }),
  }));
}

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.doUnmock('@/config/media');
  vi.doUnmock('@/data/amazonMediaSnapshot');
});

describe('la imagen de Amazon se convierte en la preferida', () => {
  it('getProductMedia devuelve la imagen remota oficial cuando hay snapshot fresco', async () => {
    mockEnvironment(true, [snapshotEntry()]);
    const { getProductMedia, getMediaSrc } =
      await import('@/application/productMediaResolver');

    const resolved = getProductMedia(product);

    expect(resolved.kind).toBe('image');
    if (resolved.kind !== 'image') return;
    expect(resolved.media.delivery).toBe('remote');
    expect(resolved.media.sourceType).toBe('amazon_official');
    expect(getMediaSrc(resolved.media)).toBe(IMAGE_URL);
  });

  it('la imagen de Amazon gana a una entrada de marca aprobada (prioridad de fuente)', async () => {
    mockEnvironment(true, [snapshotEntry()]);
    const { getProductMedia } =
      await import('@/application/productMediaResolver');
    const resolved = getProductMedia(product);
    expect(resolved.kind === 'image' && resolved.media.sourceType).toBe(
      'amazon_official',
    );
  });

  it('expone las variantes para la galería de la ficha', async () => {
    mockEnvironment(true, [snapshotEntry()]);
    const { getAmazonImageVariants } =
      await import('@/application/productMediaResolver');
    expect(getAmazonImageVariants(product)).toHaveLength(2);
  });
});

describe('fallback editorial', () => {
  it('sin Amazon (flag desactivado) el catálogo usa el fallback editorial de siempre', async () => {
    mockEnvironment(false, [snapshotEntry()]);
    const { getProductMedia, getAmazonImageVariants } =
      await import('@/application/productMediaResolver');
    expect(getProductMedia(product)).toEqual({ kind: 'editorial' });
    expect(getAmazonImageVariants(product)).toEqual([]);
  });

  it('con Amazon activo pero sin entrada para ese ASIN, fallback editorial', async () => {
    mockEnvironment(true, []);
    const { getProductMedia } =
      await import('@/application/productMediaResolver');
    expect(getProductMedia(product)).toEqual({ kind: 'editorial' });
  });

  it('con Amazon caído (snapshot vacío) ninguna página pierde su visual', async () => {
    mockEnvironment(true, []);
    const { getProductMedia } =
      await import('@/application/productMediaResolver');
    for (const candidate of PRODUCTS)
      expect(['image', 'editorial']).toContain(getProductMedia(candidate).kind);
  });

  it('una entrada cuyo productId no coincide con el producto se ignora', async () => {
    mockEnvironment(true, [snapshotEntry({ productId: 'otro-producto' })]);
    const { getProductMedia, getAmazonImageVariants } =
      await import('@/application/productMediaResolver');
    expect(getProductMedia(product)).toEqual({ kind: 'editorial' });
    expect(getAmazonImageVariants(product)).toEqual([]);
  });

  it('una entrada no approved no se pinta', async () => {
    mockEnvironment(true, [
      snapshotEntry({
        media: {
          ...snapshotEntry().media,
          status: 'candidate',
          rightsStatus: 'needs_permission',
        },
      }),
    ]);
    const { getProductMedia } =
      await import('@/application/productMediaResolver');
    expect(getProductMedia(product)).toEqual({ kind: 'editorial' });
  });
});

describe('enlace comercial con detailPageURL oficial', () => {
  it('prefiere la detailPageURL oficial de Amazon y garantiza nuestro tag', async () => {
    mockEnvironment(true, [snapshotEntry()]);
    const { resolveAmazonProductUrl } =
      await import('@/application/amazonProductUrl');

    const url = resolveAmazonProductUrl(product);

    expect(url).toBeTruthy();
    const parsed = new URL(url ?? '');
    expect(parsed.hostname).toBe('www.amazon.es');
    expect(parsed.pathname).toContain(ASIN);
    expect(parsed.searchParams.get('tag')).toBe('tusunas-21');
  });

  it('añade nuestro tag si la URL oficial trae otro', async () => {
    mockEnvironment(true, [
      snapshotEntry({
        detailPageURL: `https://www.amazon.es/dp/${ASIN}?tag=otro-21`,
      }),
    ]);
    const { resolveAmazonProductUrl } =
      await import('@/application/amazonProductUrl');
    expect(
      new URL(resolveAmazonProductUrl(product) ?? '').searchParams.get('tag'),
    ).toBe('tusunas-21');
  });

  it('DESCARTA una detailPageURL de otro ASIN y cae al enlace por ASIN', async () => {
    mockEnvironment(true, [
      snapshotEntry({ detailPageURL: 'https://www.amazon.es/dp/B0DISTINTO1' }),
    ]);
    const { resolveAmazonProductUrl } =
      await import('@/application/amazonProductUrl');
    const { buildAmazonAffiliateUrl } = await import('@/application/affiliate');
    expect(resolveAmazonProductUrl(product)).toBe(
      buildAmazonAffiliateUrl(product),
    );
  });

  it('DESCARTA una detailPageURL de otro marketplace', async () => {
    mockEnvironment(true, [
      snapshotEntry({ detailPageURL: `https://www.amazon.de/dp/${ASIN}` }),
    ]);
    const { resolveAmazonProductUrl } =
      await import('@/application/amazonProductUrl');
    expect(resolveAmazonProductUrl(product)).toBe(
      `https://www.amazon.es/dp/${ASIN}?tag=tusunas-21`,
    );
  });

  it('sin snapshot construye el enlace desde el ASIN, como siempre', async () => {
    mockEnvironment(true, []);
    const { resolveAmazonProductUrl } =
      await import('@/application/amazonProductUrl');
    expect(resolveAmazonProductUrl(product)).toBe(
      `https://www.amazon.es/dp/${ASIN}?tag=tusunas-21`,
    );
  });

  it('con el flag desactivado nunca mira el snapshot', async () => {
    mockEnvironment(false, [snapshotEntry()]);
    const { resolveAmazonProductUrl } =
      await import('@/application/amazonProductUrl');
    expect(resolveAmazonProductUrl(product)).toBe(
      `https://www.amazon.es/dp/${ASIN}?tag=tusunas-21`,
    );
  });

  it('todos los productos comprables siguen resolviendo un enlace válido', async () => {
    mockEnvironment(true, [snapshotEntry()]);
    const { resolveAmazonProductUrl } =
      await import('@/application/amazonProductUrl');
    const buyable = PRODUCTS.filter(
      (candidate) =>
        candidate.active &&
        candidate.affiliateEligible &&
        candidate.editorialStatus === 'approved',
    );
    expect(buyable.length).toBeGreaterThan(0);
    for (const candidate of buyable) {
      const url = resolveAmazonProductUrl(candidate);
      expect(url, candidate.id).toBeTruthy();
      expect(new URL(url ?? '').hostname).toBe('www.amazon.es');
      expect(new URL(url ?? '').searchParams.get('tag')).toBe('tusunas-21');
    }
  });
});
