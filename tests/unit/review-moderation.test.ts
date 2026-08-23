import { describe, expect, it } from 'vitest';
import { initialReviewStatus, isPublicReview, reviewSubmissionSchema } from '@/application/review-moderation';
const valid = { productId: 'jmeowio-francesa-rosa', rating: 5, title: 'Me gustó el diseño', body: 'La utilicé siguiendo las instrucciones y esta es mi experiencia personal completa.', recommend: true };
describe('review moderation policy', () => {
  it.each([1, 5])('acepta rating %s', (rating) => { expect(reviewSubmissionSchema.safeParse({ ...valid, rating }).success).toBe(true); });
  it.each([0, 6])('rechaza rating %s', (rating) => { expect(reviewSubmissionSchema.safeParse({ ...valid, rating }).success).toBe(false); });
  it('aplica límites al cuerpo y rechaza URLs y HTML', () => {
    expect(reviewSubmissionSchema.safeParse({ ...valid, body: 'corto' }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ ...valid, body: 'a'.repeat(1501) }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ ...valid, body: 'Mi experiencia completa está publicada en https://spam.example y debes verla allí.' }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ ...valid, body: '<strong>Una opinión suficientemente larga que intenta introducir contenido HTML arbitrario.</strong>' }).success).toBe(false);
  });
  it('empieza pending y solo approved es público', () => { expect(initialReviewStatus()).toBe('pending'); expect(isPublicReview('pending')).toBe(false); expect(isPublicReview('rejected')).toBe(false); expect(isPublicReview('approved')).toBe(true); });
});
