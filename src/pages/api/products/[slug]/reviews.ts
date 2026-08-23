import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse } from '@/application/api/http';
import {
  getD1Dependencies,
  getProductRepository,
} from '@/infrastructure/runtime';
export const prerender = false;
export const GET: APIRoute = async ({ params }) => {
  const database = env.DB;
  if (!database)
    return jsonResponse({
      reviews: [],
      message: 'Todavía no hay opiniones publicadas.',
    });
  const product = await getProductRepository().findBySlug(params.slug ?? '');
  if (!product) return jsonResponse({ error: 'Producto no encontrado.' }, 404);
  const { reviews } = getD1Dependencies(database);
  const approved = await reviews.listApproved(product.id);
  return jsonResponse({
    reviews: approved.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      recommend: review.recommend,
      createdAt: review.createdAt.toISOString(),
    })),
  });
};
