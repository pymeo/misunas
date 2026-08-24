import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '@/data/products';
import {
  productSchema,
  productTypes,
  productCategories,
} from '@/domain/product';

const findProduct = (id: string) => {
  const product = PRODUCTS.find((candidate) => candidate.id === id);
  if (!product) throw new Error(`Producto de prueba no encontrado: ${id}`);
  return product;
};

describe('catálogo de producto', () => {
  it('valida las fichas reales sin precios ni ratings', () => {
    expect(PRODUCTS).toHaveLength(34);
    for (const product of PRODUCTS) {
      expect(productSchema.parse(product)).toEqual(product);
      expect(JSON.stringify(product)).not.toMatch(/price|rating|reviewCount/iu);
    }
  });
  it('mantiene IDs, slugs y ASIN únicos', () => {
    expect(new Set(PRODUCTS.map(({ id }) => id)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map(({ slug }) => slug)).size).toBe(
      PRODUCTS.length,
    );
    expect(new Set(PRODUCTS.map(({ asin }) => asin)).size).toBe(
      PRODUCTS.length,
    );
  });
  it('usa tipos escalables y deja sin CTA a inactivos mediante flags editoriales', () => {
    expect(productTypes).toContain('press_on');
    expect(productTypes).toContain('nail_care');
    const inactive = {
      ...PRODUCTS[0],
      active: false,
      affiliateEligible: false,
      editorialStatus: 'inactive' as const,
    };
    expect(productSchema.parse(inactive).active).toBe(false);
  });
  it('incluye tornos y aspiradores como categorías/tipos reales', () => {
    expect(productCategories).toContain('tornos');
    expect(productCategories).toContain('aspiradores-polvo-unas');
    expect(productTypes).toContain('nail_drill');
    expect(productTypes).toContain('nail_dust_collector');
    expect(
      PRODUCTS.filter((product) => product.productType === 'nail_drill'),
    ).toHaveLength(8);
    expect(
      PRODUCTS.filter(
        (product) => product.productType === 'nail_dust_collector',
      ),
    ).toHaveLength(8);
  });
  it('incluye impresoras de uñas 3D como categoría/tipo real', () => {
    expect(productCategories).toContain('impresoras-unas');
    expect(productTypes).toContain('nail_printer_3d');
    expect(
      PRODUCTS.filter((product) => product.productType === 'nail_printer_3d'),
    ).toHaveLength(8);
  });
  it('no exige (ni inventa) campos de lámpara o tiras en maquinaria', () => {
    const machinery = PRODUCTS.filter(
      (product) =>
        product.productType === 'nail_drill' ||
        product.productType === 'nail_dust_collector' ||
        product.productType === 'nail_printer_3d',
    );
    expect(machinery.length).toBeGreaterThan(0);
    for (const product of machinery) {
      expect(product.requiresLamp).toBeUndefined();
      expect(product.includesLamp).toBeUndefined();
      expect(product.stripCount).toBeUndefined();
      expect(product.styleTags).toEqual([]);
    }
  });
  it('acepta technicalSpecs con campos opcionales ausentes (sin inventar datos)', () => {
    const drillWithoutDisplay = findProduct(
      'kredioo-torno-profesional-35000-rpm',
    );
    expect(
      drillWithoutDisplay.technicalSpecs?.kind === 'nail_drill' &&
        drillWithoutDisplay.technicalSpecs.display,
    ).toBe('LED');
    const drillWithNulls = findProduct('ponoseu-torno-profesional-portatil');
    expect(
      drillWithNulls.technicalSpecs?.kind === 'nail_drill' &&
        drillWithNulls.technicalSpecs.maxRpm,
    ).toBeNull();
    const dustWithoutPower = findProduct(
      'melodysusie-colector-polvo-profesional',
    );
    expect(
      dustWithoutPower.technicalSpecs?.kind === 'nail_dust_collector' &&
        dustWithoutPower.technicalSpecs.powerWatts,
    ).toBeNull();
    const printerWithoutDpi = findProduct(
      'emobwdy-impresora-unas-3d-automatica',
    );
    expect(
      printerWithoutDpi.technicalSpecs?.kind === 'nail_printer_3d' &&
        printerWithoutDpi.technicalSpecs.resolutionDpi,
    ).toBeNull();
    const printerWithDpi = findProduct('sunseota-impresora-unas-3d-smart');
    expect(
      printerWithDpi.technicalSpecs?.kind === 'nail_printer_3d' &&
        printerWithDpi.technicalSpecs.resolutionDpi,
    ).toBe(12000);
  });
  it('rechaza technicalSpecs cuyo kind no coincide con productType', () => {
    const drill = findProduct('kredioo-torno-profesional-35000-rpm');
    const mismatched = {
      ...drill,
      technicalSpecs: { kind: 'nail_dust_collector' as const, powerWatts: 60 },
    };
    expect(() => productSchema.parse(mismatched)).toThrow();
  });
  it('rechaza technicalSpecs en un producto que no es maquinaria', () => {
    const semicurada = findProduct('ohora-n-cream-cotton');
    const withSpecs = {
      ...semicurada,
      technicalSpecs: { kind: 'nail_drill' as const, maxRpm: 20000 },
    };
    expect(() => productSchema.parse(withSpecs)).toThrow();
  });
  it('rechaza campos de lámpara/tiras declarados en maquinaria', () => {
    const drill = findProduct('kredioo-torno-profesional-35000-rpm');
    const withFakeLamp = { ...drill, requiresLamp: false };
    expect(() => productSchema.parse(withFakeLamp)).toThrow();
  });
});
