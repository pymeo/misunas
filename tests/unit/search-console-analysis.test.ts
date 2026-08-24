import { describe, expect, it } from 'vitest';
import {
  aggregateQueryPageRows,
  comparePages,
  findGrowingPages,
  findQueryOpportunities,
  findTrafficWarnings,
  percentChange,
  summarize,
  type QueryTotal,
  type SearchAnalyticsRow,
} from '@/application/searchConsoleAnalysis';
import { formatSeoWeeklyReport } from '@/application/formatSeoWeeklyReport';

const row = (
  keys: string[],
  clicks: number,
  impressions: number,
  position: number,
): SearchAnalyticsRow => ({
  keys,
  clicks,
  impressions,
  ctr: impressions > 0 ? clicks / impressions : 0,
  position,
});

describe('percentChange', () => {
  it('calcula el cambio porcentual normal', () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(80, 100)).toBe(-20);
  });
  it('devuelve 0 cuando ambos periodos son 0 (sin cambio real)', () => {
    expect(percentChange(0, 0)).toBe(0);
  });
  it('devuelve null cuando no hay base previa pero sí hay datos ahora', () => {
    expect(percentChange(10, 0)).toBeNull();
  });
});

describe('summarize', () => {
  it('suma clics/impresiones y pondera la posición por impresiones', () => {
    const rows = [row(['/a/'], 10, 100, 5), row(['/b/'], 5, 100, 15)];
    expect(summarize(rows)).toEqual({
      clicks: 15,
      impressions: 200,
      ctr: 15 / 200,
      position: 10, // (5*100 + 15*100) / 200
    });
  });
  it('no divide por cero con impresiones vacías', () => {
    expect(summarize([])).toEqual({
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    });
  });
});

describe('aggregateQueryPageRows', () => {
  it('suma entre páginas y se queda con la página de más clics como referencia', () => {
    const rows = [
      row(['impresora uñas 3d', '/es/impresoras-unas-3d/'], 5, 100, 8),
      row(['impresora uñas 3d', '/es/productos/sunseota/'], 1, 20, 25),
    ];
    const [total] = aggregateQueryPageRows(rows);
    expect(total).toMatchObject({
      query: 'impresora uñas 3d',
      page: '/es/impresoras-unas-3d/',
      clicks: 6,
      impressions: 120,
    });
  });
  it('ignora filas sin query', () => {
    expect(aggregateQueryPageRows([row([''], 5, 5, 1)])).toEqual([]);
  });
});

describe('findQueryOpportunities', () => {
  it('detecta impresiones altas con CTR bajo (low-ctr)', () => {
    const current: QueryTotal[] = [
      {
        query: 'torno unas 35000 rpm',
        page: '/es/tornos-unas/',
        clicks: 1,
        impressions: 500,
        ctr: 0.002,
        position: 12,
      },
    ];
    const [opportunity] = findQueryOpportunities(current, []);
    expect(opportunity?.reason).toBe('low-ctr');
  });

  it('detecta posiciones 5-20 con volumen suficiente (near-top)', () => {
    const current: QueryTotal[] = [
      {
        query: 'aspirador polvo unas casa',
        page: '/es/aspiradores-polvo-unas/',
        clicks: 5,
        impressions: 60,
        ctr: 0.08,
        position: 11,
      },
    ];
    const [opportunity] = findQueryOpportunities(current, []);
    expect(opportunity?.reason).toBe('near-top');
  });

  it('detecta crecimiento frente al periodo anterior (growing)', () => {
    const current: QueryTotal[] = [
      {
        query: 'impresora uñas portatil',
        page: '/es/impresoras-unas-3d/',
        clicks: 4,
        impressions: 40,
        ctr: 0.1,
        position: 3,
      },
    ];
    const previous: QueryTotal[] = [
      {
        query: 'impresora uñas portatil',
        page: '/es/impresoras-unas-3d/',
        clicks: 2,
        impressions: 20,
        ctr: 0.1,
        position: 4,
      },
    ];
    const [opportunity] = findQueryOpportunities(current, previous);
    expect(opportunity?.reason).toBe('growing');
    expect(opportunity?.recommendation).toContain('+100%');
  });

  it('detecta long-tail con demanda cuando no aplica ninguna otra regla', () => {
    const current: QueryTotal[] = [
      {
        // position 25: fuera del rango near-top (5-20) pero dentro de long-tail (<=30).
        query: 'cuanto dura una impresora de uñas 3d portatil',
        page: '/es/impresoras-unas-3d/cartuchos-y-consumibles/',
        clicks: 2,
        impressions: 10,
        ctr: 0.2,
        position: 25,
      },
    ];
    const [opportunity] = findQueryOpportunities(current, []);
    expect(opportunity?.reason).toBe('long-tail');
  });

  it('no genera ninguna oportunidad para una query sana (buen CTR, top 3, sin crecimiento ni long-tail)', () => {
    const current: QueryTotal[] = [
      {
        query: 'tornos unas',
        page: '/es/tornos-unas/',
        clicks: 20,
        impressions: 100,
        ctr: 0.2,
        position: 2,
      },
    ];
    expect(findQueryOpportunities(current, [])).toEqual([]);
  });

  it('asigna como mucho una razón por query (prioridad: low-ctr > near-top > growing > long-tail)', () => {
    // Cumple low-ctr Y near-top a la vez: debe quedarse solo con low-ctr.
    const current: QueryTotal[] = [
      {
        query: 'impresoras de uñas 3d baratas',
        page: '/es/impresoras-unas-3d/precio/',
        clicks: 1,
        impressions: 200,
        ctr: 0.005,
        position: 12,
      },
    ];
    const opportunities = findQueryOpportunities(current, []);
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.reason).toBe('low-ctr');
  });

  it('respeta el límite y ordena por impresiones', () => {
    const current: QueryTotal[] = Array.from({ length: 12 }, (_, index) => ({
      query: `torno unas modelo ${index}`,
      page: '/es/tornos-unas/',
      clicks: 1,
      impressions: 100 + index,
      ctr: 0.001,
      position: 12,
    }));
    const opportunities = findQueryOpportunities(current, [], 5);
    expect(opportunities).toHaveLength(5);
    expect(opportunities[0]?.impressions).toBe(111);
  });
});

describe('comparePages / findGrowingPages / findTrafficWarnings', () => {
  const current = [
    row(['/es/impresoras-unas-3d/'], 40, 800, 6),
    row(['/es/tornos-unas/'], 10, 300, 9),
  ];
  const previous = [
    row(['/es/impresoras-unas-3d/'], 20, 400, 8),
    row(['/es/tornos-unas/'], 25, 300, 7),
  ];

  it('calcula el cambio de clics/impresiones por página', () => {
    const changes = comparePages(current, previous);
    const printers = changes.find((c) => c.page === '/es/impresoras-unas-3d/');
    expect(printers?.impressionsChangePct).toBe(100);
    expect(printers?.clicksChangePct).toBe(100);
  });

  it('identifica páginas que crecen por encima del umbral', () => {
    const changes = comparePages(current, previous);
    const growing = findGrowingPages(changes);
    expect(growing.map((p) => p.page)).toEqual(['/es/impresoras-unas-3d/']);
  });

  it('identifica páginas que pierden clics por debajo del umbral', () => {
    const changes = comparePages(current, previous);
    const warnings = findTrafficWarnings(changes);
    expect(warnings.map((p) => p.page)).toEqual(['/es/tornos-unas/']);
  });

  it('ignora bases previas demasiado pequeñas para evitar ruido (%infinito)', () => {
    const changes = comparePages(
      [row(['/es/nueva/'], 5, 50, 10)],
      [row(['/es/nueva/'], 0, 0, 0)],
    );
    expect(findGrowingPages(changes)).toEqual([]);
    expect(findTrafficWarnings(changes)).toEqual([]);
  });
});

describe('formatSeoWeeklyReport', () => {
  it('produce un informe legible con las secciones pedidas, incluso sin datos', () => {
    const report = formatSeoWeeklyReport({
      siteUrl: 'https://xn--tus-uas-8za.com/',
      currentRange: { startDate: '2026-08-17', endDate: '2026-08-23' },
      previousRange: { startDate: '2026-08-10', endDate: '2026-08-16' },
      currentSummary: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      previousSummary: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      opportunities: [],
      growingPages: [],
      warnings: [],
    });
    expect(report).toContain('# SEO WEEKLY REPORT');
    expect(report).toContain('## Top oportunidades');
    expect(report).toContain('## Páginas que más crecen');
    expect(report).toContain('## Avisos');
    expect(report).toContain('(Sin oportunidades destacadas esta semana.)');
    expect(report).not.toMatch(/NaN|undefined/);
  });

  it('nunca inventa un % cuando no hay periodo previo comparable', () => {
    const report = formatSeoWeeklyReport({
      siteUrl: 'https://xn--tus-uas-8za.com/',
      currentRange: { startDate: '2026-08-17', endDate: '2026-08-23' },
      previousRange: { startDate: '2026-08-10', endDate: '2026-08-16' },
      currentSummary: { clicks: 10, impressions: 100, ctr: 0.1, position: 8 },
      previousSummary: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      opportunities: [],
      growingPages: [],
      warnings: [],
    });
    expect(report).toContain('(sin datos previos)');
  });
});
