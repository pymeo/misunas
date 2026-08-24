/**
 * Lógica pura (sin red, sin IA) para el informe SEO semanal — ver
 * `scripts/seo-weekly-report.ts` para la orquestación real contra la
 * Search Console API. Todo aquí es determinista y testeable con datos fake
 * (`tests/unit/search-console-analysis.test.ts`).
 */

export interface SearchAnalyticsRow {
  /** `[query]`, `[page]` o `[query, page]` según la dimensión pedida a la API. */
  keys: string[];
  clicks: number;
  impressions: number;
  /** 0..1, tal cual la devuelve la API (no en %). */
  ctr: number;
  position: number;
}

export interface SummaryTotals {
  clicks: number;
  impressions: number;
  /** 0..1 */
  ctr: number;
  /** Media ponderada por impresiones. */
  position: number;
}

export interface QueryTotal {
  query: string;
  /** Página con más clics para esta query en el periodo; '' si no hay datos. */
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export type OpportunityReason =
  'low-ctr' | 'near-top' | 'growing' | 'long-tail';

export interface QueryOpportunity {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  position: number;
  reason: OpportunityReason;
  recommendation: string;
}

export interface PageChange {
  page: string;
  clicks: number;
  previousClicks: number;
  impressions: number;
  previousImpressions: number;
  /** % (12 = +12%); `null` si no hay base previa comparable. */
  clicksChangePct: number | null;
  impressionsChangePct: number | null;
}

/** `null` cuando `previous` es 0 y `current` no lo es (no hay % con sentido); 0 si ambos son 0. */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function summarize(rows: SearchAnalyticsRow[]): SummaryTotals {
  let clicks = 0;
  let impressions = 0;
  let positionWeighted = 0;
  for (const row of rows) {
    clicks += row.clicks;
    impressions += row.impressions;
    positionWeighted += row.position * row.impressions;
  }
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? positionWeighted / impressions : 0,
  };
}

/**
 * Agrega filas `[query, page]` en totales por query (sumando entre páginas)
 * y se queda con la página de más clics de cada query para poder mostrarla
 * en el informe.
 */
export function aggregateQueryPageRows(
  rows: SearchAnalyticsRow[],
): QueryTotal[] {
  interface Accumulator {
    clicks: number;
    impressions: number;
    positionWeighted: number;
    pages: Map<string, { clicks: number; impressions: number }>;
  }
  const byQuery = new Map<string, Accumulator>();
  for (const row of rows) {
    const query = row.keys[0];
    const page = row.keys[1] ?? '';
    if (!query) continue;
    const entry = byQuery.get(query) ?? {
      clicks: 0,
      impressions: 0,
      positionWeighted: 0,
      pages: new Map<string, { clicks: number; impressions: number }>(),
    };
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    entry.positionWeighted += row.position * row.impressions;
    const pageEntry = entry.pages.get(page) ?? { clicks: 0, impressions: 0 };
    pageEntry.clicks += row.clicks;
    pageEntry.impressions += row.impressions;
    entry.pages.set(page, pageEntry);
    byQuery.set(query, entry);
  }
  return [...byQuery.entries()].map(([query, entry]) => {
    const topPage = [...entry.pages.entries()].sort(
      (a, b) =>
        b[1].clicks - a[1].clicks || b[1].impressions - a[1].impressions,
    )[0];
    return {
      query,
      page: topPage?.[0] ?? '',
      clicks: entry.clicks,
      impressions: entry.impressions,
      ctr: entry.impressions > 0 ? entry.clicks / entry.impressions : 0,
      position:
        entry.impressions > 0 ? entry.positionWeighted / entry.impressions : 0,
    };
  });
}

/**
 * Umbrales deterministas, no IA. Pensados para evitar ruido en un sitio
 * nuevo con poco volumen (mínimos de impresiones/clics antes de considerar
 * un cambio significativo).
 */
export const OPPORTUNITY_RULES = {
  lowCtrMinImpressions: 50,
  lowCtrMax: 0.02,
  nearTopMin: 5,
  nearTopMax: 20,
  nearTopMinImpressions: 10,
  growthMinPreviousImpressions: 10,
  growthMinPct: 20,
  longTailMinWords: 4,
  longTailMinImpressions: 5,
  longTailMaxPosition: 30,
} as const;

/**
 * Cada query entra como mucho en UNA oportunidad (la primera regla que
 * cumple, en este orden de prioridad), para no repetirla varias veces en
 * el informe. Ordenado por impresiones descendente.
 */
export function findQueryOpportunities(
  current: QueryTotal[],
  previous: QueryTotal[],
  limit = 8,
): QueryOpportunity[] {
  const previousByQuery = new Map(previous.map((row) => [row.query, row]));
  const opportunities: QueryOpportunity[] = [];
  const r = OPPORTUNITY_RULES;

  for (const row of current) {
    const base = {
      query: row.query,
      page: row.page,
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
    };

    if (row.impressions >= r.lowCtrMinImpressions && row.ctr < r.lowCtrMax) {
      opportunities.push({
        ...base,
        reason: 'low-ctr',
        recommendation:
          'Muchas impresiones y pocos clics: revisa el title/description para esta consulta.',
      });
      continue;
    }

    if (
      row.position >= r.nearTopMin &&
      row.position <= r.nearTopMax &&
      row.impressions >= r.nearTopMinImpressions
    ) {
      opportunities.push({
        ...base,
        reason: 'near-top',
        recommendation:
          'Está cerca de primera página: refuerza contenido o enlaces internos hacia esta página.',
      });
      continue;
    }

    const prior = previousByQuery.get(row.query);
    if (prior && prior.impressions >= r.growthMinPreviousImpressions) {
      const growth = percentChange(row.impressions, prior.impressions);
      if (growth !== null && growth >= r.growthMinPct) {
        opportunities.push({
          ...base,
          reason: 'growing',
          recommendation: `En crecimiento (+${Math.round(growth)}% impresiones): mantén o amplía el contenido que la posiciona.`,
        });
        continue;
      }
    }

    const wordCount = row.query.trim().split(/\s+/).filter(Boolean).length;
    if (
      wordCount >= r.longTailMinWords &&
      row.impressions >= r.longTailMinImpressions &&
      row.position <= r.longTailMaxPosition
    ) {
      opportunities.push({
        ...base,
        reason: 'long-tail',
        recommendation:
          'Consulta long-tail con demanda real: valora cubrirla explícitamente en el contenido ya existente (sin crear página nueva).',
      });
    }
  }

  return opportunities
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit);
}

/** Compara filas `[page]` entre dos periodos, indexando por URL de página. */
export function comparePages(
  current: SearchAnalyticsRow[],
  previous: SearchAnalyticsRow[],
): PageChange[] {
  const previousByPage = new Map(
    previous.map((row) => [row.keys[0] ?? '', row]),
  );
  return current.map((row) => {
    const page = row.keys[0] ?? '';
    const prior = previousByPage.get(page);
    const previousClicks = prior?.clicks ?? 0;
    const previousImpressions = prior?.impressions ?? 0;
    return {
      page,
      clicks: row.clicks,
      previousClicks,
      impressions: row.impressions,
      previousImpressions,
      clicksChangePct: percentChange(row.clicks, previousClicks),
      impressionsChangePct: percentChange(row.impressions, previousImpressions),
    };
  });
}

export const PAGE_CHANGE_RULES = {
  growingMinPreviousImpressions: 5,
  growingMinPct: 20,
  warningMinPreviousClicks: 3,
  warningMaxPct: -20,
} as const;

export function findGrowingPages(
  changes: PageChange[],
  limit = 5,
): PageChange[] {
  const r = PAGE_CHANGE_RULES;
  return changes
    .filter(
      (change) =>
        change.previousImpressions >= r.growingMinPreviousImpressions &&
        change.impressionsChangePct !== null &&
        change.impressionsChangePct >= r.growingMinPct,
    )
    .sort(
      (a, b) => (b.impressionsChangePct ?? 0) - (a.impressionsChangePct ?? 0),
    )
    .slice(0, limit);
}

export function findTrafficWarnings(
  changes: PageChange[],
  limit = 5,
): PageChange[] {
  const r = PAGE_CHANGE_RULES;
  return changes
    .filter(
      (change) =>
        change.previousClicks >= r.warningMinPreviousClicks &&
        change.clicksChangePct !== null &&
        change.clicksChangePct <= r.warningMaxPct,
    )
    .sort((a, b) => (a.clicksChangePct ?? 0) - (b.clicksChangePct ?? 0))
    .slice(0, limit);
}
