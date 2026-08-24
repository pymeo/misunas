import { z } from 'zod';

export const mediaSourceTypes = [
  'amazon_official',
  'brand_official',
  'brand_media_kit',
  'brand_pim',
  'own',
  'editorial',
] as const;

export const mediaUsageBases = [
  'amazon_affiliate_asset',
  'manufacturer_authorized',
  'manufacturer_media_kit',
  'manufacturer_pim_authorized',
  'owned',
  'original_editorial',
] as const;

export const mediaStatuses = ['approved', 'candidate', 'rejected'] as const;

/**
 * La CSP de producción (`public/_headers`) declara `img-src 'self' data:` —
 * no permite hotlinkear hosts externos. Por diseño, una entrada solo puede
 * renderizarse como imagen real (`status: 'approved'`) si `localPath` apunta
 * a un asset ya descargado bajo `public/products/`, nunca a partir de un
 * `imageUrl` remoto suelto. `imageUrl`/`sourcePage` quedan como referencia de
 * investigación para que un humano revise la licencia y, si la aprueba,
 * descargue el asset y lo marque `approved` con `localPath`.
 */
export const productMediaSchema = z
  .object({
    productId: z.string().min(1),
    sourceType: z.enum(mediaSourceTypes),
    imageUrl: z.url().optional(),
    localPath: z
      .string()
      .regex(/^\/products\//, 'localPath debe vivir bajo /products/')
      .optional(),
    sourcePage: z.url().optional(),
    exactProductMatch: z.boolean(),
    usageBasis: z.enum(mediaUsageBases),
    alt: z.string().min(1).max(200),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    lastVerifiedAt: z.iso.date().optional(),
    status: z.enum(mediaStatuses),
    /** Nota interna de investigación; nunca se renderiza en la UI. */
    note: z.string().max(400).optional(),
  })
  .superRefine((media, context) => {
    if (media.status === 'approved' && !media.localPath)
      context.addIssue({
        code: 'custom',
        path: ['localPath'],
        message:
          'Una entrada approved necesita localPath (asset autoalojado); un imageUrl remoto no basta por la CSP actual.',
      });
    if (
      media.sourceType !== 'editorial' &&
      media.sourceType !== 'own' &&
      !media.sourcePage &&
      !media.imageUrl
    )
      context.addIssue({
        code: 'custom',
        path: ['sourcePage'],
        message: 'Toda fuente externa necesita una referencia de origen.',
      });
  });

export type ProductMedia = z.infer<typeof productMediaSchema>;
