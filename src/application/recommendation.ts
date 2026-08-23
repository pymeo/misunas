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

/**
 * El recomendador solo entiende semicuradas: tornos y aspiradores no tienen
 * lámpara/estilo/tiras que puntuar y deben quedar fuera aunque sus campos
 * opcionales queden `undefined` (lo que, sin este filtro, colaría en la rama
 * "sin lámpara" al tratar `undefined` como "no requiere lámpara").
 */
export const RECOMMENDER_ELIGIBLE_PRODUCT_TYPES: readonly Product['productType'][] =
  ['semi_cured_uv', 'starter_kit_uv', 'pre_cured_no_lamp'];

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
      !product.sample &&
      RECOMMENDER_ELIGIBLE_PRODUCT_TYPES.includes(product.productType),
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
            answers.style === 'francesa'
              ? 'Buscas una manicura francesa.'
              : answers.style === 'natural'
                ? 'Buscas un acabado natural.'
                : answers.style === 'elegante'
                  ? 'Buscas un estilo elegante.'
                  : 'Buscas un diseño llamativo.',
          );
        }
      }
      if (answers.lamp === 'tengo' && product.requiresLamp) {
        score += RECOMMENDATION_RULES.lampMatch;
        reasons.push('Ya tienes lámpara UV/LED.');
      } else if (answers.lamp === 'quiero-kit') {
        if (product.requiresLamp && product.includesLamp) {
          score += RECOMMENDATION_RULES.includedLampMatch;
          reasons.push('Buscas un kit que incluya lámpara.');
        } else if (product.requiresLamp) {
          score -= RECOMMENDATION_RULES.incompatibleLampPenalty;
          warnings.push('Necesita lámpara, pero no figura incluida.');
        }
      } else if (answers.lamp === 'sin-lampara') {
        if (!product.requiresLamp) {
          score += RECOMMENDATION_RULES.includedLampMatch;
          reasons.push('Prefieres una opción sin lámpara.');
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
        reasons.push('Es un kit pensado para empezar.');
      }
      if (answers.preference === 'kit-completo' && product.includesLamp) {
        score += RECOMMENDATION_RULES.completeKitMatch;
        reasons.push('Prefieres un kit completo con lámpara incluida.');
      }
      if (
        answers.preference === 'mas-tiras' &&
        widestStripCount !== null &&
        product.stripCount === widestStripCount
      ) {
        score += RECOMMENDATION_RULES.widestStripCountMatch;
        reasons.push(
          `Prefieres más tiras: incluye ${product.stripCount} tiras.`,
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
          reasons.push(`Buscas un diseño ${designTag}.`);
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
