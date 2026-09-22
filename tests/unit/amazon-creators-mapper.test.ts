import { describe, expect, it } from 'vitest';
import {
  mapCreatorsApiItem,
  validateDetailPageUrl,
} from '@/application/amazon/creatorsMediaMapper';
import { AMAZON_IMAGE_HOSTS } from '@/config/amazonCreators';
import type { CreatorsApiItem } from '@/domain/amazonCreators';
import { PRODUCTS } from '@/data/products';

const product = PRODUCTS.find(
  (candidate) => candidate.id === 'sunseota-impresora-unas-3d-smart',
);
if (!product?.asin) throw new Error('Producto de prueba sin ASIN');
const ASIN = product.asin;
const FETCHED_AT = '2026-09-22T10:00:00.000Z';

const image = (url: string, width = 500, height = 500) => ({
  large: { url, width, height },
});

const baseItem = (
  overrides: Partial<CreatorsApiItem> = {},
): CreatorsApiItem => ({
  asin: ASIN,
  detailPageURL: `https://www.amazon.es/dp/${ASIN}?tag=tusunas-21`,
  images: {
    primary: image(
      'https://m.media-amazon.com/images/I/principal.jpg',
      640,
      480,
    ),
    variants: [],
  },
  itemInfo: {
    title: {
      displayValue: 'Impresora de uñas 3D Sunseota con pantalla táctil',
    },
    byLineInfo: { brand: { displayValue: 'Sunseota' } },
    features: { displayValues: ['12000 DPI', 'Wi-Fi', 'Curado integrado'] },
  },
  ...overrides,
});

describe('mapCreatorsApiItem — imagen remota oficial', () => {
  it('convierte la respuesta en una entrada remote approved del dominio', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem(),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { media } = result.entry;
    expect(media.delivery).toBe('remote');
    expect(media.sourceType).toBe('amazon_official');
    expect(media.usageBasis).toBe('amazon_affiliate_asset');
    expect(media.status).toBe('approved');
    expect(media.rightsStatus).toBe('permission_granted');
    expect(media.productId).toBe(product.id);
  });

  it('usa la URL EXACTA que devuelve Amazon, sin reconstruirla', () => {
    const url =
      'https://m.media-amazon.com/images/I/41FYkVPzrIL._AC_SL1500_.jpg';
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({ images: { primary: image(url), variants: [] } }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok && result.entry.media.imageUrl).toBe(url);
  });

  it('conserva width y height de la API para evitar CLS', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem(),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok && result.entry.media.width).toBe(640);
    expect(result.ok && result.entry.media.height).toBe(480);
  });

  it('usa el título de Amazon como texto alternativo', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem(),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok && result.entry.media.alt).toBe(
      'Impresora de uñas 3D Sunseota con pantalla táctil',
    );
  });

  it('cae al nombre del catálogo si Amazon no devuelve título', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({ itemInfo: {} }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok && result.entry.media.alt).toContain(product.brand);
  });

  it('trunca un título kilométrico al límite de 200 del esquema', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({
        itemInfo: { title: { displayValue: `${'palabra '.repeat(60)}final` } },
      }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.media.alt.length).toBeLessThanOrEqual(200);
    expect(result.entry.media.alt.endsWith('…')).toBe(true);
  });

  it('no inventa atributos ausentes', () => {
    const result = mapCreatorsApiItem({
      product,
      item: {
        asin: ASIN,
        images: {
          primary: image('https://m.media-amazon.com/images/I/x.jpg'),
          variants: [],
        },
      },
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.detailPageURL).toBeUndefined();
    expect(result.entry.title).toBeUndefined();
    expect(result.entry.brand).toBeUndefined();
    expect(result.entry.features).toEqual([]);
  });
});

describe('mapCreatorsApiItem — integridad del emparejamiento', () => {
  it('RECHAZA un ASIN distinto: no acepta en silencio otro producto', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({ asin: 'B0OTROASIN' }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejection.reason).toBe('asin-mismatch');
    expect(result.rejection.detail).toContain('B0OTROASIN');
  });

  it('empareja el ASIN ignorando mayúsculas', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({ asin: ASIN.toLowerCase() }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok).toBe(true);
  });

  it('rechaza una imagen de un host que no está en la allowlist de la CSP', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({
        images: {
          primary: image('https://cdn.ejemplo.com/foto.jpg'),
          variants: [],
        },
      }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejection.reason).toBe('image-host-not-allowed');
  });

  it('el host autorizado es el que documenta Amazon', () => {
    expect([...AMAZON_IMAGE_HOSTS]).toEqual(['m.media-amazon.com']);
  });
});

describe('mapCreatorsApiItem — producto sin imagen', () => {
  it('rechaza un item sin images.primary.large (fallback editorial)', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({ images: { variants: [] } }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejection.reason).toBe('no-image');
  });

  it('rechaza un item sin bloque images en absoluto', () => {
    const result = mapCreatorsApiItem({
      product,
      item: { asin: ASIN },
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok && 'ok').toBe(false);
  });
});

describe('mapCreatorsApiItem — variantes', () => {
  it('recoge las variantes grandes y descarta la que repite la principal', () => {
    const principal = 'https://m.media-amazon.com/images/I/principal.jpg';
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({
        images: {
          primary: image(principal),
          variants: [
            image(principal),
            image('https://m.media-amazon.com/images/I/v1.jpg', 800, 600),
            image('https://m.media-amazon.com/images/I/v2.jpg'),
          ],
        },
      }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.variants).toHaveLength(2);
    expect(result.entry.variants[0]).toEqual({
      url: 'https://m.media-amazon.com/images/I/v1.jpg',
      width: 800,
      height: 600,
    });
  });

  it('descarta variantes de hosts no autorizados y lo avisa', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({
        images: {
          primary: image('https://m.media-amazon.com/images/I/p.jpg'),
          variants: [image('https://cdn.ejemplo.com/v.jpg')],
        },
      }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.variants).toHaveLength(0);
    expect(result.warnings.join(' ')).toContain('host no autorizado');
  });

  it('limita el número de variantes para no inflar la ficha', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({
        images: {
          primary: image('https://m.media-amazon.com/images/I/p.jpg'),
          variants: Array.from({ length: 12 }, (_, index) =>
            image(`https://m.media-amazon.com/images/I/v${String(index)}.jpg`),
          ),
        },
      }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok && result.entry.variants.length).toBeLessThanOrEqual(6);
  });
});

describe('validateDetailPageUrl', () => {
  it('acepta la URL oficial del marketplace español que contiene el ASIN', () => {
    expect(
      validateDetailPageUrl(
        `https://www.amazon.es/dp/${ASIN}?tag=tusunas-21`,
        ASIN,
        'www.amazon.es',
      ),
    ).toContain(ASIN);
  });

  it('acepta una URL con slug de producto antes del ASIN', () => {
    expect(
      validateDetailPageUrl(
        `https://www.amazon.es/Impresora-u%C3%B1as-3D/dp/${ASIN}/ref=xyz`,
        ASIN,
        'www.amazon.es',
      ),
    ).not.toBeNull();
  });

  it('rechaza otro marketplace: nunca se enlaza a amazon.com desde Tus-Uñas', () => {
    expect(
      validateDetailPageUrl(
        `https://www.amazon.com/dp/${ASIN}`,
        ASIN,
        'www.amazon.es',
      ),
    ).toBeNull();
  });

  it('rechaza una URL que apunta a OTRO ASIN', () => {
    expect(
      validateDetailPageUrl(
        'https://www.amazon.es/dp/B0DISTINTO1',
        ASIN,
        'www.amazon.es',
      ),
    ).toBeNull();
  });

  it('rechaza http y URLs no parseables', () => {
    expect(
      validateDetailPageUrl(
        `http://www.amazon.es/dp/${ASIN}`,
        ASIN,
        'www.amazon.es',
      ),
    ).toBeNull();
    expect(
      validateDetailPageUrl('no-es-una-url', ASIN, 'www.amazon.es'),
    ).toBeNull();
    expect(validateDetailPageUrl(undefined, ASIN, 'www.amazon.es')).toBeNull();
  });

  it('el mapper avisa y no guarda la detailPageURL cuando no valida', () => {
    const result = mapCreatorsApiItem({
      product,
      item: baseItem({ detailPageURL: 'https://www.amazon.de/dp/B0OTRO00000' }),
      fetchedAt: FETCHED_AT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.detailPageURL).toBeUndefined();
    expect(result.warnings.join(' ')).toContain('detailPageURL descartada');
  });
});
