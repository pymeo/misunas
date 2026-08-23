import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_NAME, SITE_URL } from '@/config/site';

export const prerender = true;

export async function GET() {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  return rss({
    title: SITE_NAME,
    description: 'Guías y herramientas para manicura en casa.',
    site: SITE_URL,
    items: articles.map(({ data }) => ({
      title: data.title,
      description: data.description,
      pubDate: data.publishedAt,
      link: `/es/articulos/${data.slug}/`,
    })),
  });
}
