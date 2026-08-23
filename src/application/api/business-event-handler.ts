import { z } from 'zod';
import { campaignSchema } from '@/application/campaign';
import {
  jsonResponse,
  readJson,
  validationErrorResponse,
} from '@/application/api/http';
import type { EventTracker } from '@/domain/event';
import type { RateLimiter } from '@/infrastructure/rate-limit/rate-limiter';
import { anonymousRateLimitKey } from '@/infrastructure/rate-limit/rate-limiter';

const businessEventSchema = z.object({
  type: z.literal('calculator_completed'),
  campaign: campaignSchema.optional(),
});
export async function handleBusinessEventRequest(
  request: Request,
  dependencies: { tracker: EventTracker; rateLimiter: RateLimiter },
): Promise<Response> {
  try {
    const key = await anonymousRateLimitKey(request, 'business-event');
    if (!(await dependencies.rateLimiter.allow(key)))
      return jsonResponse({ error: 'Demasiadas solicitudes.' }, 429);
    const input = businessEventSchema.parse(await readJson(request));
    await dependencies.tracker.track({
      type: input.type,
      ...(input.campaign ? { campaign: input.campaign } : {}),
    });
    return jsonResponse({ ok: true }, 202);
  } catch (error) {
    return validationErrorResponse(error);
  }
}
