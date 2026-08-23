import { z } from 'zod';

import {
  jsonResponse,
  readJson,
  validationErrorResponse,
} from '@/application/api/http';
import type { EventTracker } from '@/domain/event';
import type { RateLimiter } from '@/infrastructure/rate-limit/rate-limiter';
import { anonymousRateLimitKey } from '@/infrastructure/rate-limit/rate-limiter';

export const recommendationEventInputSchema = z.object({
  resultProductIds: z.array(z.string().min(1).max(64)).max(3),
  answers: z.object({
    style: z.enum(['natural', 'francesa', 'elegante', 'llamativa']),
    priority: z.enum(['duracion', 'facilidad', 'precio', 'diseno']),
    lamp: z.enum(['si', 'no', 'comprar']),
    nailType: z.enum(['normal', 'flexible', 'quebradiza']),
    waterExposure: z.enum(['baja', 'media', 'alta']),
  }),
});

export async function handleRecommendationEventRequest(
  request: Request,
  dependencies: { tracker: EventTracker; rateLimiter: RateLimiter },
): Promise<Response> {
  try {
    const key = await anonymousRateLimitKey(request, 'recommendation');
    if (!(await dependencies.rateLimiter.allow(key)))
      return jsonResponse({ error: 'Demasiadas solicitudes.' }, 429);
    const input = recommendationEventInputSchema.parse(await readJson(request));
    await dependencies.tracker.track({
      type: 'recommendation_completed',
      resultProductIds: input.resultProductIds,
      metadata: input.answers,
    });
    return jsonResponse({ ok: true }, 202);
  } catch (error) {
    return validationErrorResponse(error);
  }
}
