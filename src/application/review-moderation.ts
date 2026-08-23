import { z } from 'zod';
const urlPattern = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|es|info)\b)/iu;
const htmlPattern = /<\/?[a-z][^>]*>/iu;
export const reviewSubmissionSchema = z.object({
  productId: z.string().trim().min(1).max(64), rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(), body: z.string().trim().min(40).max(1500),
  recommend: z.boolean(), website: z.string().max(200).optional(),
}).superRefine((review, context) => {
  const text = `${review.title ?? ''} ${review.body}`;
  if (urlPattern.test(text)) context.addIssue({ code: 'custom', path: ['body'], message: 'No se admiten enlaces en las opiniones.' });
  if (htmlPattern.test(text)) context.addIssue({ code: 'custom', path: ['body'], message: 'No se admite HTML.' });
});
export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;
export const initialReviewStatus = () => 'pending' as const;
export const isPublicReview = (status: string): status is 'approved' => status === 'approved';
