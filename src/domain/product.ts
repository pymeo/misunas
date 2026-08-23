import { z } from 'zod';

export const productCategories = [
  'unas-semicuradas',
  'gel-nail-wraps',
  'nail-wraps',
  'press-on',
  'lamparas-uv-led',
  'esmaltes',
  'geles',
  'removedores',
  'cuidado-cuticulas',
  'kits-manicura',
  'limas',
  'tornos',
  'nail-art',
  'cuidado-de-unas',
  'accesorios',
] as const;

export const productTypes = [
  'semi_cured_uv',
  'starter_kit_uv',
  'pre_cured_no_lamp',
  'nail_wrap',
  'press_on',
  'uv_led_lamp',
  'polish',
  'gel_polish',
  'remover',
  'cuticle_care',
  'manicure_kit',
  'file_buffer',
  'nail_drill',
  'nail_art',
  'nail_care',
  'accessory',
] as const;

export const productSchema = z
  .object({
    id: z.string().min(1).max(64),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    brand: z.string().min(1).max(100),
    name: z.string().min(1).max(180),
    asin: z
      .string()
      .regex(/^[A-Z0-9]{10}$/)
      .optional(),
    category: z.enum(productCategories),
    productType: z.enum(productTypes),
    requiresLamp: z.boolean(),
    includesLamp: z.boolean(),
    stripCount: z.number().int().positive().optional(),
    styleTags: z.array(z.string().min(1).max(50)).max(16),
    colorFamily: z.string().min(1).max(50).optional(),
    useCases: z.array(z.string().min(1).max(80)).max(12),
    editorialAngles: z.array(z.string().min(1).max(80)).max(12),
    beginnerFriendly: z.boolean().optional(),
    summary: z.string().min(20).max(400),
    considerations: z.array(z.string().min(10).max(220)).max(6),
    amazonMarketplace: z.literal('es'),
    amazonUrl: z.url().optional(),
    affiliateEligible: z.boolean(),
    editorialStatus: z.enum(['candidate', 'approved', 'inactive']),
    researchStatus: z.enum([
      'verified-amazon-es',
      'editorial-verified',
      'pending',
    ]),
    sourceVerifiedAt: z.iso.date().optional(),
    active: z.boolean(),
    sample: z.boolean().default(false),
  })
  .superRefine((product, context) => {
    if (product.amazonUrl && product.asin)
      context.addIssue({
        code: 'custom',
        path: ['amazonUrl'],
        message: 'Usa asin o amazonUrl, no ambos.',
      });
    if (!product.requiresLamp && product.includesLamp)
      context.addIssue({
        code: 'custom',
        path: ['includesLamp'],
        message:
          'Un producto sin lámpara no puede incluirla como parte funcional.',
      });
    if (product.affiliateEligible && !product.asin && !product.amazonUrl)
      context.addIssue({
        code: 'custom',
        path: ['affiliateEligible'],
        message: 'Un producto afiliable necesita un ASIN o una URL verificada.',
      });
  });

export type Product = z.infer<typeof productSchema>;

export interface ProductRepository {
  findActive(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
}
