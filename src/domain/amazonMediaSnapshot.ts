import { z } from 'zod';
import { productMediaSchema } from '@/domain/productMedia';

/**
 * Snapshot de la respuesta de Amazon Creators API que consume el build.
 *
 * NO se versiona (ver `.gitignore`): la tabla oficial de caching de Amazon
 * autoriza conservar Images/ItemInfo/DetailPageURL 1 día, así que un fichero
 * en Git dejaría de cumplir esa regla a las 24 horas. Se regenera antes de
 * cada build (`npm run amazon:sync`) y `scripts/amazon-freshness-gate.ts`
 * impide desplegar con un snapshot caducado.
 */

const snapshotImageSchema = z.object({
  url: z.url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const amazonMediaSnapshotEntrySchema = z.object({
  asin: z.string().regex(/^[A-Z0-9]{10}$/),
  productId: z.string().min(1),
  /** Momento exacto de la respuesta de Amazon; base del control de frescura. */
  fetchedAt: z.iso.datetime(),
  /** Imagen principal, ya validada como `delivery: 'remote'` del dominio. */
  media: productMediaSchema,
  /** Variantes para la pequeña galería de la ficha individual. */
  variants: z.array(snapshotImageSchema).max(8).default([]),
  /** URL oficial devuelta por Amazon para este ASIN y este partnerTag. */
  detailPageURL: z.url().optional(),
  /** Título tal cual lo devuelve Amazon; se usa como texto alternativo. */
  title: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  /** Bullets de Amazon. Se guardan como claim de Amazon, nunca como hecho editorial. */
  features: z.array(z.string().min(1)).max(10).default([]),
});

export type AmazonMediaSnapshotEntry = z.infer<
  typeof amazonMediaSnapshotEntrySchema
>;

export const amazonMediaSnapshotSchema = z.object({
  /** Versión del formato, para poder invalidar snapshots antiguos. */
  schemaVersion: z.literal(1),
  /** Momento en que terminó el sync completo. */
  generatedAt: z.iso.datetime(),
  marketplace: z.string().min(1),
  partnerTag: z.string().min(1),
  /** `false` cuando el sync corrió sin credenciales: snapshot vacío legítimo. */
  amazonQueried: z.boolean(),
  entries: z.array(amazonMediaSnapshotEntrySchema),
});

export type AmazonMediaSnapshot = z.infer<typeof amazonMediaSnapshotSchema>;

export const EMPTY_AMAZON_MEDIA_SNAPSHOT_ENTRIES: AmazonMediaSnapshotEntry[] =
  [];
