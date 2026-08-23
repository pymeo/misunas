import { z } from 'zod';

export const productCategories = [
  'unas-semicuradas',
  'nail-wraps',
  'lamparas-uv',
  'press-on',
  'cuidado',
] as const;

export const productSchema = z
  .object({
    id: z.string().min(1).max(64),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    brand: z.string().min(1).max(100),
    name: z.string().min(1).max(160),
    asin: z
      .string()
      .regex(/^[A-Z0-9]{10}$/)
      .optional(),
    category: z.enum(productCategories),
    productType: z.enum([
      'semicured-gel',
      'nail-wrap',
      'uv-lamp',
      'press-on',
      'care',
    ]),
    design: z.enum(['natural', 'francesa', 'elegante', 'llamativa']),
    colorFamily: z.string().min(1).max(50),
    stripsCount: z.number().int().positive().optional(),
    uvRequired: z.boolean(),
    lampIncluded: z.boolean(),
    curingSeconds: z.number().int().positive().optional(),
    claimedDurationMin: z.number().int().positive().optional(),
    claimedDurationMax: z.number().int().positive().optional(),
    beginnerFriendly: z.boolean(),
    characteristics: z.array(z.string().min(1).max(80)).max(12),
    amazonMarketplace: z.literal('es'),
    amazonUrl: z.url().optional(),
    active: z.boolean(),
    sample: z.boolean().default(false),
  })
  .superRefine((product, context) => {
    if (
      product.claimedDurationMin !== undefined &&
      product.claimedDurationMax !== undefined &&
      product.claimedDurationMin > product.claimedDurationMax
    ) {
      context.addIssue({
        code: 'custom',
        path: ['claimedDurationMin'],
        message: 'La duración mínima no puede superar la máxima.',
      });
    }
    if (product.amazonUrl && product.asin) {
      context.addIssue({
        code: 'custom',
        path: ['amazonUrl'],
        message: 'Usa asin o amazonUrl, no ambos.',
      });
    }
  });

export type Product = z.infer<typeof productSchema>;

export interface ProductRepository {
  findActive(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
}
