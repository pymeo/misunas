import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_URL } from '@/config/site';
import { BRAND_PATHS, INDEXABLE_STATIC_PATHS, PRODUCT_PATHS } from '@/config/routes';

export const prerender = true;
export const GET: APIRoute = async () => {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const paths = [
    ...INDEXABLE_STATIC_PATHS,
    ...PRODUCT_PATHS,
    ...BRAND_PATHS,
    ...articles.map(({ data }) => `/es/articulos/${data.slug}/`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${new URL(path, SITE_URL).toString()}</loc></url>`).join('')}</urlset>`;
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
