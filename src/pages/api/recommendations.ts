import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { handleRecommendationEventRequest } from '@/application/api/recommendation-event-handler';
import { jsonResponse } from '@/application/api/http';
import { getD1Dependencies, rateLimiter } from '@/infrastructure/runtime';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const database = env.DB;
  if (!database) return jsonResponse({ error: 'D1 no está configurado.' }, 503);
  const { tracker } = getD1Dependencies(database);
  return handleRecommendationEventRequest(request, { tracker, rateLimiter });
};
