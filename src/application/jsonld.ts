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

export function productJsonLd(product: Product, approvedReviews: ProductReview[] = []): JsonLd {
  const publicReviews = approvedReviews.filter((review) => review.status === 'approved');
  const data: JsonLd = {
    '@context': context,
    '@type': 'Product',
    name: product.name,
    brand: { '@type': 'Brand', name: product.brand },
    category: product.category,
    url: new URL(`/es/productos/${product.slug}/`, SITE_URL).toString(),
  };
  if (publicReviews.length > 0) {
    const average = publicReviews.reduce((sum, review) => sum + review.rating, 0) / publicReviews.length;
    data.aggregateRating = { '@type': 'AggregateRating', ratingValue: Math.round(average * 10) / 10, reviewCount: publicReviews.length, bestRating: 5, worstRating: 1 };
    data.review = publicReviews.map((review) => ({
      '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 },
      ...(review.title ? { name: review.title } : {}), reviewBody: review.body,
      author: { '@type': 'Person', name: 'Usuaria de Tus-Uñas' }, datePublished: review.createdAt.toISOString(),
    }));
  }
  return data;
}
