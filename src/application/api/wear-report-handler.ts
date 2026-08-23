import { z } from 'zod';

import {
  jsonResponse,
  readJson,
  validationErrorResponse,
} from '@/application/api/http';
import type { ProductRepository } from '@/domain/product';
import type { WearReportRepository } from '@/domain/wear-report';
import type { RateLimiter } from '@/infrastructure/rate-limit/rate-limiter';
import { anonymousRateLimitKey } from '@/infrastructure/rate-limit/rate-limiter';

export const wearReportInputSchema = z.object({
  productId: z.string().min(1).max(64),
  wearDays: z.number().int().min(1).max(60),
  waterExposure: z.enum(['poca', 'normal', 'mucha']),
  manualWork: z.enum(['bajo', 'medio', 'alto']),
  prepUsed: z.boolean(),
  lampUsed: z.boolean().nullable(),
  removalReason: z.enum([
    'despegadas',
    'rotas',
    'crecimiento',
    'cambio',
    'otro',
  ]),
  website: z.string().max(200).optional(),
});

export async function handleWearReportRequest(
  request: Request,
  dependencies: {
    wearReports: WearReportRepository;
    products: ProductRepository;
    rateLimiter: RateLimiter;
  },
): Promise<Response> {
  try {
    const key = await anonymousRateLimitKey(request, 'wear-report');
    if (!(await dependencies.rateLimiter.allow(key)))
      return jsonResponse({ error: 'Demasiadas solicitudes.' }, 429);
    const input = wearReportInputSchema.parse(await readJson(request));
    if (input.website) return jsonResponse({ ok: true }, 202);
    if (!(await dependencies.products.findById(input.productId))) {
      return jsonResponse({ error: 'Producto no encontrado.' }, 404);
    }
    await dependencies.wearReports.create({
      id: crypto.randomUUID(),
      productId: input.productId,
      wearDays: input.wearDays,
      nailType: null,
      waterExposure: input.waterExposure,
      manualWork: input.manualWork,
      prepUsed: input.prepUsed,
      lampUsed: input.lampUsed,
      removalReason: input.removalReason,
      createdAt: new Date(),
    });
    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    return validationErrorResponse(error);
  }
}
