import type {
  PageChange,
  QueryOpportunity,
  SummaryTotals,
} from '@/application/searchConsoleAnalysis';
import { percentChange } from '@/application/searchConsoleAnalysis';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface SeoWeeklyReportInput {
  siteUrl: string;
  currentRange: DateRange;
  previousRange: DateRange;
  currentSummary: SummaryTotals;
  previousSummary: SummaryTotals;
  opportunities: QueryOpportunity[];
  growingPages: PageChange[];
  warnings: PageChange[];
}

const formatInt = (value: number): string =>
  Math.round(value).toLocaleString('es-ES');
const formatPosition = (value: number): string => value.toFixed(1);
const formatPct = (value: number): string => `${value.toFixed(1)}%`;
const formatChange = (value: number | null): string =>
  value === null
    ? '(sin datos previos)'
    : `(${value >= 0 ? '+' : ''}${Math.round(value)}%)`;

/** Markdown determinista, pensado para GitHub Actions Step Summary / Issue body. */
export function formatSeoWeeklyReport(input: SeoWeeklyReportInput): string {
  const clicksChange = percentChange(
    input.currentSummary.clicks,
    input.previousSummary.clicks,
  );
  const impressionsChange = percentChange(
    input.currentSummary.impressions,
    input.previousSummary.impressions,
  );

  const lines: string[] = [];
  lines.push('# SEO WEEKLY REPORT');
  lines.push('');
  lines.push(`**Sitio:** ${input.siteUrl}`);
  lines.push(
    `**Periodo actual:** ${input.currentRange.startDate} → ${input.currentRange.endDate}`,
  );
  lines.push(
    `**Periodo anterior:** ${input.previousRange.startDate} → ${input.previousRange.endDate}`,
  );
  lines.push('');
  lines.push('## Resumen');
  lines.push('');
  lines.push(
    `- Clicks: ${formatInt(input.currentSummary.clicks)} ${formatChange(clicksChange)}`,
  );
  lines.push(
    `- Impressions: ${formatInt(input.currentSummary.impressions)} ${formatChange(impressionsChange)}`,
  );
  lines.push(`- CTR: ${formatPct(input.currentSummary.ctr * 100)}`);
  lines.push(
    `- Average position: ${formatPosition(input.currentSummary.position)}`,
  );
  lines.push('');

  lines.push('## Top oportunidades');
  lines.push('');
  if (input.opportunities.length === 0) {
    lines.push('(Sin oportunidades destacadas esta semana.)');
  } else {
    input.opportunities.forEach((opportunity, index) => {
      lines.push(`${index + 1}. **${opportunity.query}**`);
      lines.push(`   - impressions: ${formatInt(opportunity.impressions)}`);
      lines.push(`   - clicks: ${formatInt(opportunity.clicks)}`);
      lines.push(`   - position: ${formatPosition(opportunity.position)}`);
      lines.push(`   - page: ${opportunity.page || '(no identificada)'}`);
      lines.push(`   - recomendación: ${opportunity.recommendation}`);
    });
  }
  lines.push('');

  lines.push('## Páginas que más crecen');
  lines.push('');
  if (input.growingPages.length === 0) {
    lines.push('(Ninguna página con crecimiento destacado esta semana.)');
  } else {
    input.growingPages.forEach((page, index) => {
      lines.push(
        `${index + 1}. ${page.page} — impressions ${formatInt(page.previousImpressions)} → ${formatInt(page.impressions)} ${formatChange(page.impressionsChangePct)}`,
      );
    });
  }
  lines.push('');

  lines.push('## Avisos');
  lines.push('');
  if (input.warnings.length === 0) {
    lines.push('(Sin avisos esta semana.)');
  } else {
    input.warnings.forEach((page, index) => {
      lines.push(
        `${index + 1}. ${page.page} — clicks ${formatInt(page.previousClicks)} → ${formatInt(page.clicks)} ${formatChange(page.clicksChangePct)}`,
      );
    });
  }
  lines.push('');

  return lines.join('\n');
}
