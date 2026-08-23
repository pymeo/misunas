import { describe, expect, it } from 'vitest';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from '@/application/jsonld';

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
    ];
    const serialized = serializeJsonLd({ '@graph': structures });
    const parse = () => {
      JSON.parse(serialized);
    };
    expect(parse).not.toThrow();
    expect(serialized).not.toMatch(
      /AggregateRating|Offer|ratingValue|reviewCount|price/,
    );
  });

  it('escapes opening tags before embedding in HTML', () => {
    expect(serializeJsonLd({ value: '</script>' })).not.toContain('</script>');
  });
});
