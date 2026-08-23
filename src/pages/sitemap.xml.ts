import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_URL } from '@/config/site';

export const prerender = true;
const staticPaths = [
  '/es/',
  '/es/unas-semicuradas/',
  '/es/mejores-unas-semicuradas/',
  '/es/que-son-las-unas-semicuradas/',
  '/es/como-poner-unas-semicuradas/',
  '/es/como-quitar-unas-semicuradas/',
  '/es/calculadora-ahorro-manicura/',
  '/es/encuentra-tus-unas/',
  '/es/aviso-afiliados/',
  '/es/privacidad/',
  '/es/cookies/',
  '/es/aviso-legal/',
];

export const GET: APIRoute = async () => {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const paths = [
    ...staticPaths,
    ...articles.map(({ data }) => `/es/articulos/${data.slug}/`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${new URL(path, SITE_URL).toString()}</loc></url>`).join('')}</urlset>`;
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
