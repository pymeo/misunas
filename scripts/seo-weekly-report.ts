import { GoogleAuth } from 'google-auth-library';
import { formatSeoWeeklyReport } from '../src/application/formatSeoWeeklyReport';
import {
  aggregateQueryPageRows,
  comparePages,
  findGrowingPages,
  findQueryOpportunities,
  findTrafficWarnings,
  summarize,
  type SearchAnalyticsRow,
} from '../src/application/searchConsoleAnalysis';
import { SITE_URL } from '../src/config/site';

/**
 * Informe SEO semanal vía Search Console API. Determinista: sin IA, sin
 * llamadas externas más allá de la propia API de Google. Requiere:
 *   - GOOGLE_SERVICE_ACCOUNT_JSON: JSON completo de la service account
 *     (con permiso "Restringido" o "Completo" sobre la propiedad en
 *     Search Console — Configuración → Usuarios y permisos).
 *   - GSC_SITE_URL (opcional): identificador exacto de la propiedad tal
 *     como aparece en Search Console — `sc-domain:xn--tus-uas-8za.com`
 *     (propiedad de dominio) o `https://xn--tus-uas-8za.com/` (prefijo de
 *     URL). Por defecto usa el segundo formato con el host canónico.
 */

const SEARCH_ANALYTICS_SCOPE =
  'https://www.googleapis.com/auth/webmasters.readonly';
const ROW_LIMIT = 1000;
/** GSC tarda unos días en estabilizar datos recientes; se deja un margen. */
const DATA_LAG_DAYS = 3;
const WINDOW_DAYS = 7;

interface RawSearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function computeDateRanges(today = new Date()) {
  const currentEnd = addDays(today, -DATA_LAG_DAYS);
  const currentStart = addDays(currentEnd, -(WINDOW_DAYS - 1));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(WINDOW_DAYS - 1));
  return {
    current: {
      startDate: formatDate(currentStart),
      endDate: formatDate(currentEnd),
    },
    previous: {
      startDate: formatDate(previousStart),
      endDate: formatDate(previousEnd),
    },
  };
}

function getServiceAccountCredentials(): Record<string, unknown> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw)
    throw new Error(
      'Falta GOOGLE_SERVICE_ACCOUNT_JSON: el JSON completo de la service account de Google Cloud con acceso a Search Console.',
    );
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido.');
  }
}

function getSiteUrl(): string {
  return process.env.GSC_SITE_URL?.trim() || `${SITE_URL}/`;
}

async function queryAnalytics(
  auth: GoogleAuth,
  siteUrl: string,
  params: { startDate: string; endDate: string; dimensions: string[] },
): Promise<SearchAnalyticsRow[]> {
  const client = await auth.getClient();
  const response = await client.request<{ rows?: RawSearchAnalyticsRow[] }>({
    url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    method: 'POST',
    data: {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions,
      rowLimit: ROW_LIMIT,
    },
  });
  return (response.data.rows ?? []).map((row) => ({
    keys: row.keys ?? [],
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

async function main() {
  const siteUrl = getSiteUrl();
  const credentials = getServiceAccountCredentials();
  const auth = new GoogleAuth({
    credentials,
    scopes: [SEARCH_ANALYTICS_SCOPE],
  });
  const { current, previous } = computeDateRanges();

  const [queryPageCurrent, queryPagePrevious, pageCurrent, pagePrevious] =
    await Promise.all([
      queryAnalytics(auth, siteUrl, {
        ...current,
        dimensions: ['query', 'page'],
      }),
      queryAnalytics(auth, siteUrl, {
        ...previous,
        dimensions: ['query', 'page'],
      }),
      queryAnalytics(auth, siteUrl, { ...current, dimensions: ['page'] }),
      queryAnalytics(auth, siteUrl, { ...previous, dimensions: ['page'] }),
    ]);

  const currentQueries = aggregateQueryPageRows(queryPageCurrent);
  const previousQueries = aggregateQueryPageRows(queryPagePrevious);
  const pageChanges = comparePages(pageCurrent, pagePrevious);

  const report = formatSeoWeeklyReport({
    siteUrl,
    currentRange: current,
    previousRange: previous,
    currentSummary: summarize(pageCurrent),
    previousSummary: summarize(pagePrevious),
    opportunities: findQueryOpportunities(currentQueries, previousQueries),
    growingPages: findGrowingPages(pageChanges),
    warnings: findTrafficWarnings(pageChanges),
  });

  console.log(report);
}

main().catch((error: unknown) => {
  console.error(
    'SEO WEEKLY REPORT — error:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
