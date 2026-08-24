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
  'aspiradores-polvo-unas',
  'impresoras-unas',
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
  'nail_dust_collector',
  'nail_printer_3d',
  'nail_art',
  'nail_care',
  'accessory',
] as const;

const MACHINERY_PRODUCT_TYPES = [
  'nail_drill',
  'nail_dust_collector',
  'nail_printer_3d',
] as const;

const nailDrillTechnicalSpecsSchema = z
  .object({
    kind: z.literal('nail_drill'),
    maxRpm: z.number().int().positive().nullable().optional(),
    accessoryCount: z.number().int().positive().nullable().optional(),
    display: z.enum(['LED', 'LCD']).nullable().optional(),
    rechargeable: z.boolean().nullable().optional(),
    usbPowered: z.boolean().nullable().optional(),
    pedalIncluded: z.boolean().nullable().optional(),
    bidirectional: z.boolean().nullable().optional(),
    integratedLight: z.boolean().nullable().optional(),
    ceramicBitIncluded: z.boolean().nullable().optional(),
  })
  .strict();

const nailDustCollectorTechnicalSpecsSchema = z
  .object({
    kind: z.literal('nail_dust_collector'),
    powerWatts: z.number().int().positive().nullable().optional(),
    suctionPa: z.number().int().positive().nullable().optional(),
    fanCount: z.number().int().positive().nullable().optional(),
    suctionLevels: z.number().int().positive().nullable().optional(),
    reusableFilter: z.boolean().nullable().optional(),
    disposableFilterCount: z.number().int().positive().nullable().optional(),
    rechargeable: z.boolean().nullable().optional(),
    integratedLight: z.boolean().nullable().optional(),
    brushlessMotor: z.boolean().nullable().optional(),
  })
  .strict();

const nailPrinter3dTechnicalSpecsSchema = z
  .object({
    kind: z.literal('nail_printer_3d'),
    resolutionDpi: z.number().int().positive().nullable().optional(),
    claimedPrintSeconds: z.number().int().positive().nullable().optional(),
    touchscreenInches: z.number().positive().nullable().optional(),
    appControl: z.boolean().nullable().optional(),
    wifi: z.boolean().nullable().optional(),
    automaticNailRecognition: z.boolean().nullable().optional(),
    portable: z.boolean().nullable().optional(),
    integratedCuring: z.boolean().nullable().optional(),
    customImageUpload: z.boolean().nullable().optional(),
  })
  .strict();

export const technicalSpecsSchema = z.discriminatedUnion('kind', [
  nailDrillTechnicalSpecsSchema,
  nailDustCollectorTechnicalSpecsSchema,
  nailPrinter3dTechnicalSpecsSchema,
]);

export type TechnicalSpecs = z.infer<typeof technicalSpecsSchema>;

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
    requiresLamp: z.boolean().optional(),
    includesLamp: z.boolean().optional(),
    stripCount: z.number().int().positive().optional(),
    technicalSpecs: technicalSpecsSchema.optional(),
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
    /**
     * Allowlist editorial explícita de fichas aptas para indexación (Google).
     * `false` por defecto: la mayoría del catálogo son fichas de investigación
     * verificadas pero no verificadas físicamente por el equipo, así que
     * empiezan en `noindex`. Ver `src/application/productIndexability.ts`
     * para la política que consume este campo — nunca se decide en la vista.
     */
    seoIndexable: z.boolean().default(false),
  })
  .superRefine((product, context) => {
    if (product.amazonUrl && product.asin)
      context.addIssue({
        code: 'custom',
        path: ['amazonUrl'],
        message: 'Usa asin o amazonUrl, no ambos.',
      });
    if (
      product.requiresLamp !== undefined &&
      !product.requiresLamp &&
      product.includesLamp
    )
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
    const isMachinery = (MACHINERY_PRODUCT_TYPES as readonly string[]).includes(
      product.productType,
    );
    if (isMachinery) {
      if (
        product.requiresLamp !== undefined ||
        product.includesLamp !== undefined ||
        product.stripCount !== undefined
      )
        context.addIssue({
          code: 'custom',
          path: ['requiresLamp'],
          message:
            'La maquinaria (tornos, aspiradores, impresoras 3D) no debe declarar campos de lámpara ni número de tiras.',
        });
    } else if (product.technicalSpecs) {
      context.addIssue({
        code: 'custom',
        path: ['technicalSpecs'],
        message:
          'technicalSpecs solo aplica a tornos, aspiradores e impresoras 3D.',
      });
    }
    if (
      product.technicalSpecs &&
      product.technicalSpecs.kind !== product.productType
    )
      context.addIssue({
        code: 'custom',
        path: ['technicalSpecs'],
        message: 'technicalSpecs.kind debe coincidir con productType.',
      });
  });

export type Product = z.infer<typeof productSchema>;

export interface ProductRepository {
  findActive(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
}
