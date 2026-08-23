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

const review = (status: ProductReview['status']): ProductReview => ({
  id: 'de305d54-75b4-431b-adb2-eb6b9e546014',
  productId: PRODUCTS[0]!.id,
  rating: 4,
  title: 'Experiencia verificada por moderación',
  body: 'Esta opinión contiene suficiente detalle y ha pasado por moderación.',
  recommend: true,
  status,
  createdAt: new Date('2026-08-23T00:00:00Z'),
  approvedAt:
    status === 'approved' ? new Date('2026-08-23T01:00:00Z') : null,
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
      productJsonLd(PRODUCTS[0]!),
    ];
    const serialized = serializeJsonLd({ '@graph': structures });
    expect(() => JSON.parse(serialized)).not.toThrow();
    expect(serialized).not.toMatch(
      /AggregateRating|Offer|ratingValue|reviewCount|price/,
    );
  });

  it('ignores pending and rejected reviews entirely', () => {
    const serialized = serializeJsonLd(
      productJsonLd(PRODUCTS[0]!, [review('pending'), review('rejected')]),
    );
    expect(serialized).not.toMatch(/AggregateRating|Review|ratingValue/);
  });

  it('emits rating data only from approved public reviews', () => {
    const serialized = serializeJsonLd(
      productJsonLd(PRODUCTS[0]!, [review('approved'), review('pending')]),
    );
    expect(serialized).toContain('AggregateRating');
    expect(serialized).toContain('"reviewCount":1');
    expect(serialized).toContain('"ratingValue":4');
  });

  it('escapes opening tags before embedding in HTML', () => {
    expect(serializeJsonLd({ value: '</script>' })).not.toContain('</script>');
  });
});
