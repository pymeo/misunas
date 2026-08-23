import type { Product } from '@/domain/product';

export interface RecommendationAnswers {
  style: 'natural' | 'francesa' | 'elegante' | 'llamativa';
  priority: 'duracion' | 'facilidad' | 'precio' | 'diseno';
  lamp: 'si' | 'no' | 'comprar';
  nailType: 'normal' | 'flexible' | 'quebradiza';
  waterExposure: 'baja' | 'media' | 'alta';
}

export interface Recommendation {
  product: Product;
  score: number;
  reasons: string[];
}

export const RECOMMENDATION_RULES = {
  styleMatch: 5,
  beginnerPriority: 4,
  designPriority: 3,
  ownsLampCompatibility: 3,
  noLampCompatibility: 6,
  wantsLampKit: 5,
  durabilityCharacteristic: 4,
  waterResistanceCharacteristic: 3,
  fragileNailFriendly: 2,
} as const;

const hasCharacteristic = (product: Product, text: string): boolean =>
  product.characteristics.some((item) =>
    item.toLocaleLowerCase('es').includes(text),
  );

export function recommendProducts(
  products: Product[],
  answers: RecommendationAnswers,
): Recommendation[] {
  return products
    .filter((product) => product.active)
    .map((product) => {
      let score = 0;
      const reasons: string[] = [];

      if (product.design === answers.style) {
        score += RECOMMENDATION_RULES.styleMatch;
        reasons.push(`Encaja con el estilo ${answers.style}`);
      }
      if (answers.priority === 'facilidad' && product.beginnerFriendly) {
        score += RECOMMENDATION_RULES.beginnerPriority;
        reasons.push('Buena opción para principiantes');
      }
      if (answers.priority === 'diseno' && product.design === answers.style) {
        score += RECOMMENDATION_RULES.designPriority;
        reasons.push('Coincide con el diseño que buscas');
      }
      if (answers.lamp === 'si' && product.uvRequired) {
        score += RECOMMENDATION_RULES.ownsLampCompatibility;
        reasons.push('Compatible con tu lámpara');
      }
      if (answers.lamp === 'no' && !product.uvRequired) {
        score += RECOMMENDATION_RULES.noLampCompatibility;
        reasons.push('No requiere lámpara UV');
      }
      if (answers.lamp === 'comprar' && product.lampIncluded) {
        score += RECOMMENDATION_RULES.wantsLampKit;
        reasons.push('Incluye lámpara para empezar');
      }
      if (
        answers.priority === 'duracion' &&
        hasCharacteristic(product, 'duración')
      ) {
        score += RECOMMENDATION_RULES.durabilityCharacteristic;
        reasons.push('Adecuada si priorizas duración');
      }
      if (
        answers.waterExposure === 'alta' &&
        hasCharacteristic(product, 'agua')
      ) {
        score += RECOMMENDATION_RULES.waterResistanceCharacteristic;
        reasons.push('Pensada para una exposición frecuente al agua');
      }
      if (
        answers.nailType === 'quebradiza' &&
        hasCharacteristic(product, 'flexible')
      ) {
        score += RECOMMENDATION_RULES.fragileNailFriendly;
        reasons.push('Formato flexible para uñas quebradizas');
      }

      return { product, score, reasons: reasons.slice(0, 3) };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.product.name.localeCompare(b.product.name, 'es'),
    )
    .slice(0, 3);
}
