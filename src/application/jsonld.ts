import { SITE_NAME, SITE_URL } from '@/config/site';
import type { Product } from '@/domain/product';
import type { ProductReview } from '@/domain/review';

type JsonLd = Record<string, unknown>;

const context = 'https://schema.org';

export const websiteJsonLd = (): JsonLd => ({
  '@context': context,
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'es',
});

export const organizationJsonLd = (): JsonLd => ({
  '@context': context,
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
});

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
): JsonLd {
  return {
    '@context': context,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, SITE_URL).toString(),
    })),
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  path: string;
  publishedAt: Date;
  updatedAt?: Date;
  author: string;
  image?: string;
}): JsonLd {
  const data: JsonLd = {
    '@context': context,
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: new URL(input.path, SITE_URL).toString(),
    datePublished: input.publishedAt.toISOString(),
    dateModified: (input.updatedAt ?? input.publishedAt).toISOString(),
    inLanguage: 'es',
    author: { '@type': 'Organization', name: input.author },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
  if (input.image) data.image = new URL(input.image, SITE_URL).toString();
  return data;
}

export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

const EDITORIAL_REVIEW_AUTHOR = {
  '@type': 'Team',
  name: 'Equipo editorial de Tus-Uñas',
};

const notesItemList = (notes: string[]): JsonLd => ({
  '@type': 'ItemList',
  itemListElement: notes.map((note, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: note,
  })),
});

export interface ProductJsonLdOptions {
  /**
   * URL absoluta de una imagen real/autorizada del producto (resuelta por
   * `getProductMedia` fuera de este módulo). Nunca pasar la de una
   * ilustración editorial: no es una fotografía del producto.
   */
  imageUrl?: string;
  /**
   * Aciertos reales y ya visibles en la página — normalmente
   * `pick.reasons` del Top 3 (ver `EditorialVerdict`/`EditorialTopPicks`).
   */
  positiveNotes?: string[];
  /**
   * Puntos a tener en cuenta reales y ya visibles en la página — el
   * `product.considerations` que se muestra en la ficha.
   */
  negativeNotes?: string[];
}

/**
 * Tus-Uñas no vende directamente (no hay `Offer`/precio propio), así que
 * esta ficha se optimiza como página editorial `Product`/Product Snippet:
 * datos verificables del catálogo (`name`/`brand`/`category`/`url`), una
 * imagen solo cuando es real y autorizada, y — cuando hay contenido
 * editorial suficiente — una reseña propia (nunca de una persona inventada)
 * con lo que destacamos y lo que conviene tener en cuenta, en el mismo
 * texto que ya ve la usuaria. Nunca se genera `aggregateRating` ni
 * `ratingValue` a partir de esta reseña editorial: esos campos siguen
 * dependiendo exclusivamente de reseñas de usuarias reales y aprobadas.
 */
export function productJsonLd(
  product: Product,
  approvedReviews: ProductReview[] = [],
  options: ProductJsonLdOptions = {},
): JsonLd {
  const publicReviews = approvedReviews.filter(
    (review) => review.status === 'approved',
  );
  const data: JsonLd = {
    '@context': context,
    '@type': 'Product',
    name: product.name,
    brand: { '@type': 'Brand', name: product.brand },
    category: product.category,
    url: new URL(`/es/productos/${product.slug}/`, SITE_URL).toString(),
  };
  if (options.imageUrl)
    data.image = new URL(options.imageUrl, SITE_URL).toString();

  const reviews: JsonLd[] = [];
  if (publicReviews.length > 0) {
    const average =
      publicReviews.reduce((sum, review) => sum + review.rating, 0) /
      publicReviews.length;
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(average * 10) / 10,
      reviewCount: publicReviews.length,
      bestRating: 5,
      worstRating: 1,
    };
    reviews.push(
      ...publicReviews.map((review) => ({
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: review.rating,
          bestRating: 5,
          worstRating: 1,
        },
        ...(review.title ? { name: review.title } : {}),
        reviewBody: review.body,
        author: { '@type': 'Person', name: 'Usuaria de Tus-Uñas' },
        datePublished: review.createdAt.toISOString(),
      })),
    );
  }

  const positiveNotes = options.positiveNotes ?? [];
  const negativeNotes = options.negativeNotes ?? [];
  if (positiveNotes.length + negativeNotes.length >= 2) {
    reviews.push({
      '@type': 'Review',
      author: EDITORIAL_REVIEW_AUTHOR,
      reviewBody: product.summary,
      ...(positiveNotes.length > 0
        ? { positiveNotes: notesItemList(positiveNotes) }
        : {}),
      ...(negativeNotes.length > 0
        ? { negativeNotes: notesItemList(negativeNotes) }
        : {}),
    });
  }
  if (reviews.length > 0) data.review = reviews;

  return data;
}
