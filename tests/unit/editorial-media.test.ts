import { describe, expect, it } from 'vitest';
import { editorialMediaSchema } from '@/domain/editorialMedia';

describe('editorialMediaSchema', () => {
  const base = {
    id: 'torno-como-usar-hero',
    localPath: '/editorial/torno-como-usar-hero.webp',
    alt: 'Manicurista usando un torno eléctrico sobre una uña preparada',
    width: 1200,
    height: 800,
    context: 'guide' as const,
  };

  it('acepta una entrada válida bajo /editorial/', () => {
    expect(() => editorialMediaSchema.parse(base)).not.toThrow();
  });

  it('rechaza localPath fuera de /editorial/ (no se confunde con ProductMedia)', () => {
    expect(() =>
      editorialMediaSchema.parse({
        ...base,
        localPath: '/products/torno/hero.webp',
      }),
    ).toThrow();
  });

  it('no vincula la imagen a ningún productId: un campo extra se descarta, no se valida como vínculo', () => {
    const parsed = editorialMediaSchema.parse({
      ...base,
      productId: 'kredioo-torno-profesional-35000-rpm',
    });
    expect(parsed).not.toHaveProperty('productId');
  });

  it('rechaza un context fuera del vocabulario cerrado', () => {
    expect(() =>
      editorialMediaSchema.parse({ ...base, context: 'product-page' }),
    ).toThrow();
  });
});
