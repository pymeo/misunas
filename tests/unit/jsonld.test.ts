import { describe, expect, it } from 'vitest';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  productJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from '@/application/jsonld';
import { PRODUCTS } from '@/data/products';
import type { ProductReview } from '@/domain/review';

const product = PRODUCTS.at(0);
if (product === undefined) throw new Error('El catálogo real está vacío.');
const parseJson = (value: string): unknown => JSON.parse(value) as unknown;

const review = (status: ProductReview['status']): ProductReview => ({
  id: 'de305d54-75b4-431b-adb2-eb6b9e546014',
  productId: product.id,
  rating: 4,
  title: 'Experiencia verificada por moderación',
  body: 'Esta opinión contiene suficiente detalle y ha pasado por moderación.',
  recommend: true,
  status,
  createdAt: new Date('2026-08-23T00:00:00Z'),
  approvedAt: status === 'approved' ? new Date('2026-08-23T01:00:00Z') : null,
});

describe('JSON-LD builders', () => {
  it('builds serializable typed structures without fictitious commercial data', () => {
    const structures = [
      websiteJsonLd(),
      breadcrumbJsonLd([{ name: 'Inicio', path: '/es/' }]),
      articleJsonLd({
        headline: 'Una guía editorial',
        description: 'Descripción comprobable',
        path: '/es/guia/',
        publishedAt: new Date('2026-08-23T00:00:00Z'),
        author: 'Equipo editorial Tus-Uñas',
      }),
      productJsonLd(product),
    ];
    const serialized = serializeJsonLd({ '@graph': structures });
    expect(() => parseJson(serialized)).not.toThrow();
    expect(serialized).not.toMatch(
      /AggregateRating|Offer|ratingValue|reviewCount|price/,
    );
  });

  it('ignores pending and rejected reviews entirely', () => {
    const serialized = serializeJsonLd(
      productJsonLd(product, [review('pending'), review('rejected')]),
    );
    expect(serialized).not.toMatch(/AggregateRating|Review|ratingValue/);
  });

  it('emits rating data only from approved public reviews', () => {
    const serialized = serializeJsonLd(
      productJsonLd(product, [review('approved'), review('pending')]),
    );
    expect(serialized).toContain('AggregateRating');
    expect(serialized).toContain('"reviewCount":1');
    expect(serialized).toContain('"ratingValue":4');
  });

  it('escapes opening tags before embedding in HTML', () => {
    expect(serializeJsonLd({ value: '</script>' })).not.toContain('</script>');
  });

  it('only emits image when a real/authorized image URL is provided', () => {
    const withoutImage = productJsonLd(product);
    expect(withoutImage.image).toBeUndefined();
    const withImage = productJsonLd(product, [], {
      imageUrl: '/products/demo/main.webp',
    });
    expect(withImage.image).toBe(
      'https://xn--tus-uas-8za.com/products/demo/main.webp',
    );
  });

  it('never fabricates an editorial review with fewer than two real notes', () => {
    const oneNote = productJsonLd(product, [], {
      positiveNotes: ['Pantalla táctil'],
    });
    expect(serializeJsonLd(oneNote)).not.toContain('positiveNotes');
    expect(serializeJsonLd(oneNote)).not.toMatch(/"@type":"Review"/);
  });

  it('builds an editorial review as ItemList/ListItem, attributed to the team, never a ratingValue', () => {
    const withNotes = productJsonLd(product, [], {
      positiveNotes: ['Pantalla táctil', 'Diseños personalizados'],
      negativeNotes: ['El precio no figura verificado.'],
    });
    const reviews = withNotes.review as Record<string, unknown>[];
    const editorial = reviews.find(
      (entry) =>
        (entry.author as Record<string, unknown> | undefined)?.['@type'] ===
        'Team',
    );
    expect(editorial).toBeDefined();
    expect(editorial?.author).toEqual({
      '@type': 'Team',
      name: 'Equipo editorial de Tus-Uñas',
    });
    expect(editorial?.reviewRating).toBeUndefined();
    expect(editorial?.positiveNotes).toEqual({
      '@type': 'ItemList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Pantalla táctil' },
        { '@type': 'ListItem', position: 2, name: 'Diseños personalizados' },
      ],
    });
    expect(editorial?.negativeNotes).toEqual({
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'El precio no figura verificado.',
        },
      ],
    });
    expect(serializeJsonLd(withNotes)).not.toMatch(/ratingValue/);
  });

  it('keeps the editorial review body as real, already-visible content (product.summary)', () => {
    const withNotes = productJsonLd(product, [], {
      positiveNotes: ['Uno', 'Dos'],
    });
    const reviews = withNotes.review as Record<string, unknown>[];
    const editorial = reviews.find(
      (entry) =>
        (entry.author as Record<string, unknown> | undefined)?.['@type'] ===
        'Team',
    );
    expect(editorial?.reviewBody).toBe(product.summary);
  });

  it('lets a user review and the editorial review coexist without mixing ratings', () => {
    const combined = productJsonLd(product, [review('approved')], {
      positiveNotes: ['Uno', 'Dos'],
    });
    const reviews = combined.review as Record<string, unknown>[];
    expect(reviews).toHaveLength(2);
    expect(combined.aggregateRating).toBeDefined();
    const userReview = reviews.find(
      (entry) =>
        (entry.author as Record<string, unknown> | undefined)?.['@type'] ===
        'Person',
    );
    expect(userReview?.reviewRating).toBeDefined();
  });
});
