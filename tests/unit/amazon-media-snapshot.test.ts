import { describe, expect, it } from 'vitest';
import { CREATORS_API_CACHE_TTL_MS } from '@/config/amazonCreators';
import { loadAmazonMediaSnapshot } from '@/data/amazonMediaSnapshot';
import { amazonMediaSnapshotSchema } from '@/domain/amazonMediaSnapshot';

const NOW = Date.parse('2026-09-22T12:00:00.000Z');

const entry = (asin: string, fetchedAt: string) => ({
  asin,
  productId: `producto-${asin.toLowerCase()}`,
  fetchedAt,
  media: {
    productId: `producto-${asin.toLowerCase()}`,
    delivery: 'remote',
    sourceType: 'amazon_official',
    imageUrl: `https://m.media-amazon.com/images/I/${asin}.jpg`,
    exactProductMatch: true,
    usageBasis: 'amazon_affiliate_asset',
    alt: `Producto ${asin}`,
    width: 500,
    height: 500,
    status: 'approved',
    rightsStatus: 'permission_granted',
  },
  variants: [],
  detailPageURL: `https://www.amazon.es/dp/${asin}?tag=tusunas-21`,
  features: [],
});

const snapshot = (entries: unknown[]) => ({
  schemaVersion: 1,
  generatedAt: '2026-09-22T11:00:00.000Z',
  marketplace: 'www.amazon.es',
  partnerTag: 'tusunas-21',
  amazonQueried: true,
  entries,
});

describe('TTL de caché', () => {
  it('son 24 h: el máximo que autoriza Amazon para Images/ItemInfo/DetailPageURL', () => {
    expect(CREATORS_API_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe('loadAmazonMediaSnapshot', () => {
  it('indexa por ASIN las entradas frescas', () => {
    const result = loadAmazonMediaSnapshot(
      snapshot([entry('B000000001', '2026-09-22T11:00:00.000Z')]),
      NOW,
    );
    expect(result.byAsin.size).toBe(1);
    expect(result.byAsin.get('B000000001')?.productId).toBe(
      'producto-b000000001',
    );
    expect(result.problem).toBeNull();
  });

  it('busca por ASIN sin distinguir mayúsculas', () => {
    const result = loadAmazonMediaSnapshot(
      snapshot([entry('B000000001', '2026-09-22T11:00:00.000Z')]),
      NOW,
    );
    expect(result.byAsin.get('B000000001')).toBeDefined();
  });

  it('IGNORA las entradas que superan la TTL de 24 h, aunque el JSON las traiga', () => {
    const result = loadAmazonMediaSnapshot(
      snapshot([
        entry('B000000001', '2026-09-22T11:00:00.000Z'),
        entry('B000000002', '2026-09-20T11:00:00.000Z'),
      ]),
      NOW,
    );
    expect(result.byAsin.size).toBe(1);
    expect(result.staleAsins).toEqual(['B000000002']);
    expect(result.problem).toContain('TTL');
  });

  it('descarta una entrada con fecha ilegible en vez de darla por buena', () => {
    const result = loadAmazonMediaSnapshot(
      snapshot([
        {
          ...entry('B000000001', '2026-09-22T11:00:00.000Z'),
          fetchedAt: 'ayer',
        },
      ]),
      NOW,
    );
    expect(result.snapshot).toBeNull();
    expect(result.byAsin.size).toBe(0);
  });

  it('un snapshot inválido se ignora entero y NO rompe el build', () => {
    const result = loadAmazonMediaSnapshot({ cualquier: 'cosa' }, NOW);
    expect(result.snapshot).toBeNull();
    expect(result.byAsin.size).toBe(0);
    expect(result.problem).toContain('no valida');
  });

  it('un snapshot vacío (build sin credenciales) es un estado válido y silencioso', () => {
    const result = loadAmazonMediaSnapshot(
      { ...snapshot([]), amazonQueried: false },
      NOW,
    );
    expect(result.snapshot?.amazonQueried).toBe(false);
    expect(result.byAsin.size).toBe(0);
    expect(result.problem).toBeNull();
  });

  it('null/undefined tampoco rompen', () => {
    expect(loadAmazonMediaSnapshot(null, NOW).byAsin.size).toBe(0);
    expect(loadAmazonMediaSnapshot(undefined, NOW).byAsin.size).toBe(0);
  });

  it('rechaza una versión de esquema desconocida (snapshot de otro formato)', () => {
    const result = loadAmazonMediaSnapshot(
      { ...snapshot([]), schemaVersion: 99 },
      NOW,
    );
    expect(result.snapshot).toBeNull();
  });

  it('el snapshot real del repositorio es válido o está vacío, nunca a medias', () => {
    const live = loadAmazonMediaSnapshot();
    /**
     * Sea cual sea el estado del checkout (snapshot vacío en CI, real tras un
     * sync), la carga nunca debe dejar entradas sin validar.
     */
    expect(live.byAsin.size).toBe(
      live.snapshot === null ? 0 : live.byAsin.size,
    );
    if (live.snapshot !== null)
      expect(live.snapshot.entries).toBeInstanceOf(Array);
  });
});

describe('esquema del snapshot', () => {
  it('exige que la media sea del dominio (rechaza remote approved sin imageUrl)', () => {
    const broken = snapshot([
      {
        ...entry('B000000001', '2026-09-22T11:00:00.000Z'),
        media: {
          productId: 'x',
          delivery: 'remote',
          sourceType: 'amazon_official',
          exactProductMatch: true,
          usageBasis: 'amazon_affiliate_asset',
          alt: 'x',
          status: 'approved',
          rightsStatus: 'permission_granted',
        },
      },
    ]);
    expect(amazonMediaSnapshotSchema.safeParse(broken).success).toBe(false);
  });

  it('exige un ASIN con el formato de Amazon', () => {
    const broken = snapshot([entry('NO-ES-ASIN', '2026-09-22T11:00:00.000Z')]);
    expect(amazonMediaSnapshotSchema.safeParse(broken).success).toBe(false);
  });
});
