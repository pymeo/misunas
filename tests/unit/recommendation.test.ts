import { describe, expect, it } from 'vitest';
import {
  recommendProducts,
  RECOMMENDATION_RULES,
  type RecommendationAnswers,
} from '@/application/recommendation';
import { PRODUCTS } from '@/data/products';

const base: RecommendationAnswers = {
  style: 'indiferente',
  lamp: 'tengo',
  experience: 'indiferente',
  preference: 'indiferente',
};
describe('recommendProducts', () => {
  it('favorece francesa con lámpara y explica solo atributos reales', () => {
    const result = recommendProducts(PRODUCTS, { ...base, style: 'francesa' });
    expect(result[0]?.product.styleTags).toContain('francesa');
    expect(result[0]?.reasons.join(' ')).toMatch(/francesa|lámpara/iu);
    expect(result).toHaveLength(3);
  });
  it('excluye todo producto que requiere lámpara cuando no se quiere usar', () => {
    const result = recommendProducts(PRODUCTS, {
      ...base,
      lamp: 'sin-lampara',
    });
    expect(result).toHaveLength(1);
    expect(result.every(({ product }) => !product.requiresLamp)).toBe(true);
  });
  it('prioriza starter kits con lámpara incluida', () => {
    const result = recommendProducts(PRODUCTS, {
      ...base,
      lamp: 'quiero-kit',
      experience: 'primera-vez',
      preference: 'kit-completo',
    });
    expect(result[0]?.product.productType).toBe('starter_kit_uv');
    expect(result[0]?.product.includesLamp).toBe(true);
    expect(result[0]?.reasons).toContain('Es un kit pensado para empezar.');
  });
  it('no convierte primera vez en señal para productos no clasificados', () => {
    const result = recommendProducts(PRODUCTS, {
      ...base,
      experience: 'primera-vez',
    });
    expect(
      result
        .filter(({ reasons }) =>
          reasons.some((reason) => reason.includes('kit pensado para empezar')),
        )
        .every(
          ({ product }) =>
            product.productType === 'starter_kit_uv' ||
            product.beginnerFriendly === true,
        ),
    ).toBe(true);
  });
  it('usa stripCount real para la preferencia de más tiras', () => {
    const result = recommendProducts(PRODUCTS, {
      ...base,
      preference: 'mas-tiras',
    });
    expect(result[0]?.product.stripCount).toBe(34);
    expect(result[0]?.reasons.join(' ')).toContain('34 tiras');
  });
  it('nunca recomienda maquinaria (tornos ni aspiradores), aunque no tengan lámpara definida', () => {
    const scenarios: RecommendationAnswers[] = [
      { ...base, lamp: 'sin-lampara' },
      { ...base, lamp: 'quiero-kit', experience: 'primera-vez' },
      { ...base, style: 'llamativa', preference: 'diseno' },
      { ...base, preference: 'mas-tiras' },
      { ...base },
    ];
    for (const answers of scenarios) {
      const result = recommendProducts(PRODUCTS, answers);
      expect(
        result.every(
          ({ product }) =>
            product.productType !== 'nail_drill' &&
            product.productType !== 'nail_dust_collector',
        ),
      ).toBe(true);
    }
  });
  it('es determinista, no devuelve porcentajes y centraliza las reglas', () => {
    const answers = { ...base, style: 'natural' } as const;
    expect(recommendProducts(PRODUCTS, answers)).toEqual(
      recommendProducts(PRODUCTS, answers),
    );
    expect(JSON.stringify(recommendProducts(PRODUCTS, answers))).not.toMatch(
      /%|precio|agua|quebradiza|resiste/iu,
    );
    expect(RECOMMENDATION_RULES.styleMatch).toBeGreaterThan(0);
  });
});
