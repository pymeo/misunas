import type { APIRoute } from 'astro';
import { SITE_URL } from '@/config/site';
export const prerender = true;
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
