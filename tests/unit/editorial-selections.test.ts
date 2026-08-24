import { describe, expect, it } from 'vitest';
import {
  EDITORIAL_SELECTIONS,
  getResolvedPicks,
  getResolvedQuickChoices,
} from '@/data/editorialSelections';
import { PRODUCTS } from '@/data/products';

const PUBLISHED_CATEGORIES = [
  'tornos',
  'aspiradores-polvo-unas',
  'unas-semicuradas',
] as const;

const findProduct = (id: string) =>
  PRODUCTS.find((product) => product.id === id);

describe('editorial selections', () => {
  it('cada categoría comercial publicada tiene una selección editorial de 3 picks', () => {
    for (const category of PUBLISHED_CATEGORIES) {
      const editorial = EDITORIAL_SELECTIONS.find(
        (entry) => entry.category === category,
      );
      expect(
        editorial,
        `falta selección editorial para ${category}`,
      ).toBeDefined();
      expect(editorial?.picks).toHaveLength(3);
    }
  });

  it('cada Top 3 referencia productIds que existen, están activos y aprobados', () => {
    for (const entry of EDITORIAL_SELECTIONS) {
      for (const pick of entry.picks) {
        const product = findProduct(pick.productId);
        expect(
          product,
          `pick ${pick.productId} de ${entry.category} no existe en el catálogo`,
        ).toBeDefined();
        expect(product?.active).toBe(true);
        expect(product?.editorialStatus).toBe('approved');
      }
    }
  });

  it('cada pick pertenece realmente a la categoría de su selección editorial', () => {
    for (const entry of EDITORIAL_SELECTIONS) {
      for (const pick of entry.picks) {
        const product = findProduct(pick.productId);
        expect(product?.category).toBe(entry.category);
      }
    }
  });

  it('ningún productId está duplicado dentro del mismo Top 3', () => {
    for (const entry of EDITORIAL_SELECTIONS) {
      const ids = entry.picks.map((pick) => pick.productId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('los rangos de cada Top 3 son exactamente 1, 2 y 3', () => {
    for (const entry of EDITORIAL_SELECTIONS) {
      const ranks = entry.picks.map((pick) => pick.rank).sort();
      expect(ranks).toEqual([1, 2, 3]);
    }
  });

  it('las alternativas cruzadas referencian productos reales y activos', () => {
    for (const entry of EDITORIAL_SELECTIONS) {
      for (const pick of entry.picks) {
        if (!pick.alternative) continue;
        const alt = findProduct(pick.alternative.productId);
        expect(
          alt,
          `alternativa ${pick.alternative.productId} de ${pick.productId} no existe`,
        ).toBeDefined();
        expect(alt?.active).toBe(true);
        expect(alt?.editorialStatus).toBe('approved');
      }
    }
  });

  it('getResolvedPicks devuelve los 3 productos reales, ordenados por rango', () => {
    for (const category of PUBLISHED_CATEGORIES) {
      const resolved = getResolvedPicks(category);
      expect(resolved).toHaveLength(3);
      expect(resolved.map(({ pick }) => pick.rank)).toEqual([1, 2, 3]);
      for (const { pick, product } of resolved)
        expect(product.id).toBe(pick.productId);
    }
  });

  it('las quick choices con productId referencian productos reales', () => {
    for (const category of PUBLISHED_CATEGORIES) {
      const choices = getResolvedQuickChoices(category);
      expect(choices.length).toBeGreaterThan(0);
      for (const choice of choices)
        if (choice.productId) expect(choice.product?.id).toBe(choice.productId);
    }
  });

  it('detecta incoherencias: las RPM/W/Pa citadas en "reasons" coinciden con las specs reales del producto', () => {
    for (const entry of EDITORIAL_SELECTIONS) {
      for (const pick of entry.picks) {
        const product = findProduct(pick.productId);
        if (!product) continue;
        for (const reason of pick.reasons) {
          const rpmValue = /([\d.]+)\s*RPM/.exec(reason)?.[1];
          if (rpmValue && product.technicalSpecs?.kind === 'nail_drill') {
            const claimed = Number(rpmValue.replaceAll('.', ''));
            expect(product.technicalSpecs.maxRpm).toBe(claimed);
          }
          const wattsValue = /^(\d+)\s*W$/.exec(reason)?.[1];
          if (
            wattsValue &&
            product.technicalSpecs?.kind === 'nail_dust_collector'
          ) {
            expect(product.technicalSpecs.powerWatts).toBe(Number(wattsValue));
          }
          const stripValue = /^(\d+)\s*tiras$/.exec(reason)?.[1];
          if (stripValue) expect(product.stripCount).toBe(Number(stripValue));
        }
      }
    }
  });
});
