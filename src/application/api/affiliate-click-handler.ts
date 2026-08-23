import { z } from 'zod';
import { campaignSchema } from '@/application/campaign';

import {
  jsonResponse,
  readJson,
  validationErrorResponse,
} from '@/application/api/http';
import type { EventTracker } from '@/domain/event';
import type { ProductRepository } from '@/domain/product';
import type { RateLimiter } from '@/infrastructure/rate-limit/rate-limiter';
import { anonymousRateLimitKey } from '@/infrastructure/rate-limit/rate-limiter';

export const affiliateClickInputSchema = z.object({
  productId: z.string().min(1).max(64),
  sourcePage: z.string().startsWith('/').max(300),
  component: z.string().min(1).max(80),
  position: z.number().int().min(1).max(100).optional(),
  campaign: campaignSchema.optional(),
});

export async function handleAffiliateClickRequest(
  request: Request,
  dependencies: {
    tracker: EventTracker;
    products: ProductRepository;
    rateLimiter: RateLimiter;
  },
): Promise<Response> {
  try {
    const key = await anonymousRateLimitKey(request, 'amazon-click');
    if (!(await dependencies.rateLimiter.allow(key)))
      return jsonResponse({ error: 'Demasiadas solicitudes.' }, 429);
    const input = affiliateClickInputSchema.parse(await readJson(request));
    if (!(await dependencies.products.findById(input.productId))) {
      return jsonResponse({ error: 'Producto no encontrado.' }, 404);
    }
    await dependencies.tracker.track({
      type: 'amazon_click',
      productId: input.productId,
      sourcePage: input.sourcePage,
      component: input.component,
      ...(input.position === undefined ? {} : { position: input.position }),
      ...(input.campaign === undefined ? {} : { campaign: input.campaign }),
    });
    return jsonResponse({ ok: true }, 202);
  } catch (error) {
    return validationErrorResponse(error);
  }
}
