import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isProductSeoIndexable } from '@/application/productIndexability';
import { SITE_URL } from '@/config/site';
import { INDEXABLE_STATIC_PATHS } from '@/config/routes';
import { PRODUCTS } from '@/data/products';

export const prerender = true;

interface SitemapEntry {
  path: string;
  /** Solo se incluye cuando hay una fecha real de última revisión — nunca se inventa. */
  lastmod?: string;
}

export const GET: APIRoute = async () => {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const entries: SitemapEntry[] = [
    ...INDEXABLE_STATIC_PATHS.map((path): SitemapEntry => ({ path })),
    ...articles.map(({ data }): SitemapEntry => ({
      path: `/es/articulos/${data.slug}/`,
      lastmod: (data.updatedAt ?? data.publishedAt).toISOString().slice(0, 10),
    })),
    /**
     * Fase 2: solo las fichas de producto explícitamente indexables
     * (`isProductSeoIndexable`) entran en el sitemap — el resto del
     * catálogo sigue siendo `noindex` y no debe filtrarse aquí por
     * accidente (ver tests/seo/seo-smoke.test.ts y
     * tests/unit/productIndexability.test.ts).
     */
    ...PRODUCTS.filter(isProductSeoIndexable).map((product): SitemapEntry => ({
      path: `/es/productos/${product.slug}/`,
      ...(product.sourceVerifiedAt
        ? { lastmod: product.sourceVerifiedAt }
        : {}),
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries
    .map(
      (entry) =>
        `<url><loc>${new URL(entry.path, SITE_URL).toString()}</loc>${
          entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''
        }</url>`,
    )
    .join('')}</urlset>`;
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
