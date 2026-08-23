import {
  jsonResponse,
  readJson,
  validationErrorResponse,
} from '@/application/api/http';
import {
  initialReviewStatus,
  reviewSubmissionSchema,
} from '@/application/review-moderation';
import type { ProductRepository } from '@/domain/product';
import type { EventTracker } from '@/domain/event';
import type { ReviewRepository } from '@/domain/review';
import type { RateLimiter } from '@/infrastructure/rate-limit/rate-limiter';
import { anonymousRateLimitKey } from '@/infrastructure/rate-limit/rate-limiter';

export async function handleReviewRequest(
  request: Request,
  dependencies: {
    reviews: ReviewRepository;
    products: ProductRepository;
    rateLimiter: RateLimiter;
    tracker?: EventTracker;
  },
): Promise<Response> {
  try {
    const key = await anonymousRateLimitKey(request, 'review');
    if (!(await dependencies.rateLimiter.allow(key)))
      return jsonResponse({ error: 'Demasiadas solicitudes.' }, 429);
    const input = reviewSubmissionSchema.parse(await readJson(request));
    if (input.website) return jsonResponse({ ok: true }, 202);
    if (!(await dependencies.products.findById(input.productId)))
      return jsonResponse({ error: 'Producto no encontrado.' }, 404);
    await dependencies.reviews.create({
      id: crypto.randomUUID(),
      productId: input.productId,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      recommend: input.recommend,
      status: initialReviewStatus(),
      createdAt: new Date(),
      approvedAt: null,
    });
    await dependencies.tracker
      ?.track({ type: 'review_submitted', productId: input.productId })
      .catch(() => undefined);
    return jsonResponse({ ok: true, status: 'pending' }, 201);
  } catch (error) {
    return validationErrorResponse(error);
  }
}
