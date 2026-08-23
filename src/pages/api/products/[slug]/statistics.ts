import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { jsonResponse } from '@/application/api/http';
import { calculateProductStatistics } from '@/application/statistics';
import {
  getD1Dependencies,
  getProductRepository,
} from '@/infrastructure/runtime';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const database = env.DB;
  if (!database) return jsonResponse({ error: 'D1 no está configurado.' }, 503);
  const product = await getProductRepository().findBySlug(params.slug ?? '');
  if (!product) return jsonResponse({ error: 'Producto no encontrado.' }, 404);
  const { wearReports } = getD1Dependencies(database);
  const statistics = calculateProductStatistics(
    await wearReports.listWearDays(product.id),
  );
  return jsonResponse(
    statistics.sufficientSample
      ? statistics
      : { ...statistics, message: 'Aún no tenemos suficientes experiencias.' },
  );
};
