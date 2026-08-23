import type { Product } from '@/domain/product';

export interface RecommendationAnswers {
  style: 'natural' | 'francesa' | 'elegante' | 'llamativa' | 'indiferente';
  lamp: 'tengo' | 'quiero-kit' | 'sin-lampara';
  experience: 'primera-vez' | 'con-experiencia' | 'indiferente';
  preference: 'kit-completo' | 'mas-tiras' | 'diseno' | 'indiferente';
}
export interface Recommendation {
  product: Product;
  score: number;
  compatibility: 'Muy alta' | 'Alta' | 'Media';
  reasons: string[];
  warnings: string[];
}

/** Pesos editoriales centralizados: miden coincidencias observables, nunca rendimiento. */
export const RECOMMENDATION_RULES = {
  styleMatch: 4,
  lampMatch: 4,
  includedLampMatch: 6,
  firstKitMatch: 3,
  completeKitMatch: 4,
  widestStripCountMatch: 2,
  distinctiveDesignMatch: 2,
  incompatibleLampPenalty: 100,
  compatibility: { veryHigh: 10, high: 6 },
  distinctiveDesignTags: [
    'floral',
    'leopardo',
    'degradado',
    'llamativa',
    'nail-art',
  ],
} as const;

const STYLE_TAGS: Record<
  Exclude<RecommendationAnswers['style'], 'indiferente'>,
  readonly string[]
> = {
  natural: ['natural', 'nude'],
  francesa: ['francesa'],
  elegante: ['elegante', 'clasica', 'boda', 'nude'],
  llamativa: ['llamativa', 'leopardo', 'floral', 'degradado'],
};

function compatibilityLabel(score: number): Recommendation['compatibility'] {
  if (score >= RECOMMENDATION_RULES.compatibility.veryHigh) return 'Muy alta';
  if (score >= RECOMMENDATION_RULES.compatibility.high) return 'Alta';
  return 'Media';
}

export function recommendProducts(
  products: Product[],
  answers: RecommendationAnswers,
): Recommendation[] {
  const eligible = products.filter(
    (product) =>
      product.active &&
      product.editorialStatus === 'approved' &&
      !product.sample,
  );
  const knownCounts = eligible.flatMap((product) =>
    product.stripCount === undefined ? [] : [product.stripCount],
  );
  const widestStripCount =
    knownCounts.length > 0 ? Math.max(...knownCounts) : null;
  return eligible
    .map((product) => {
      let score = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];
      if (answers.style !== 'indiferente') {
        const matchedTags = STYLE_TAGS[answers.style].filter((tag) =>
          product.styleTags.includes(tag),
        );
        if (matchedTags.length > 0) {
          score += RECOMMENDATION_RULES.styleMatch;
          reasons.push(
            `El catálogo identifica su estilo como ${matchedTags[0]}.`,
          );
        }
      }
      if (answers.lamp === 'tengo' && product.requiresLamp) {
        score += RECOMMENDATION_RULES.lampMatch;
        reasons.push('Requiere lámpara UV/LED y ya indicas que tienes una.');
      } else if (answers.lamp === 'quiero-kit') {
        if (product.requiresLamp && product.includesLamp) {
          score += RECOMMENDATION_RULES.includedLampMatch;
          reasons.push('Incluye la lámpara necesaria dentro del kit.');
        } else if (product.requiresLamp) {
          score -= RECOMMENDATION_RULES.incompatibleLampPenalty;
          warnings.push('Necesita lámpara, pero no figura incluida.');
        }
      } else if (answers.lamp === 'sin-lampara') {
        if (!product.requiresLamp) {
          score += RECOMMENDATION_RULES.includedLampMatch;
          reasons.push('El formato verificado no necesita lámpara.');
        } else {
          score -= RECOMMENDATION_RULES.incompatibleLampPenalty;
          warnings.push('Este producto necesita curado con lámpara UV/LED.');
        }
      }
      if (
        answers.experience === 'primera-vez' &&
        (product.productType === 'starter_kit_uv' ||
          product.beginnerFriendly === true)
      ) {
        score += RECOMMENDATION_RULES.firstKitMatch;
        reasons.push('Está clasificado explícitamente como kit de inicio.');
      }
      if (answers.preference === 'kit-completo' && product.includesLamp) {
        score += RECOMMENDATION_RULES.completeKitMatch;
        reasons.push('El catálogo confirma que incluye lámpara.');
      }
      if (
        answers.preference === 'mas-tiras' &&
        widestStripCount !== null &&
        product.stripCount === widestStripCount
      ) {
        score += RECOMMENDATION_RULES.widestStripCountMatch;
        reasons.push(
          `Incluye ${product.stripCount} tiras, la cantidad más amplia del catálogo verificado actual.`,
        );
      }
      if (answers.preference === 'diseno') {
        const designTags: readonly string[] =
          RECOMMENDATION_RULES.distinctiveDesignTags;
        const designTag = product.styleTags.find((tag) =>
          designTags.includes(tag),
        );
        if (designTag) {
          score += RECOMMENDATION_RULES.distinctiveDesignMatch;
          reasons.push(`Su ficha identifica el diseño «${designTag}».`);
        }
      }
      return {
        product,
        score,
        compatibility: compatibilityLabel(Math.max(0, score)),
        reasons: reasons.slice(0, 4),
        warnings,
      };
    })
    .filter(({ score, reasons }) => score > 0 && reasons.length > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.product.name.localeCompare(b.product.name, 'es'),
    )
    .slice(0, 3);
}
