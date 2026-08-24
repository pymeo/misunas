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

const calculatorCompletedSchema = z.object({
  type: z.literal('calculator_completed'),
  calculator: z.enum(['ahorro-manicura', 'rentabilidad-impresora']).optional(),
  campaign: campaignSchema.optional(),
});

/** Se dispara una vez por carga cuando el Top 1 del Top 3 entra en el viewport (Fase 15). */
const topPickImpressionSchema = z.object({
  type: z.literal('top_pick_impression'),
  productId: z.string().min(1).max(64),
  category: z.string().min(1).max(60),
  sourcePage: z.string().startsWith('/').max(300),
});

/** Se dispara una vez por carga en la primera interacción real con el comparador (cambiar la selección). */
const comparatorUsedSchema = z.object({
  type: z.literal('comparator_used'),
  category: z.string().min(1).max(60),
  sourcePage: z.string().startsWith('/').max(300),
});

export const businessEventSchema = z.discriminatedUnion('type', [
  calculatorCompletedSchema,
  topPickImpressionSchema,
  comparatorUsedSchema,
]);

export async function handleBusinessEventRequest(
  request: Request,
  dependencies: { tracker: EventTracker; rateLimiter: RateLimiter },
): Promise<Response> {
  try {
    const key = await anonymousRateLimitKey(request, 'business-event');
    if (!(await dependencies.rateLimiter.allow(key)))
      return jsonResponse({ error: 'Demasiadas solicitudes.' }, 429);
    const input = businessEventSchema.parse(await readJson(request));
    if (input.type === 'calculator_completed') {
      await dependencies.tracker.track({
        type: 'calculator_completed',
        ...(input.calculator ? { calculator: input.calculator } : {}),
        ...(input.campaign ? { campaign: input.campaign } : {}),
      });
    } else {
      await dependencies.tracker.track(input);
    }
    return jsonResponse({ ok: true }, 202);
  } catch (error) {
    return validationErrorResponse(error);
  }
}
