import { z } from 'zod';

/**
 * Dónde se usaría la imagen — nunca en una ficha de producto concreta
 * (eso es `ProductMedia`, con su propio `productId`). Una foto editorial
 * ilustra un artículo, una guía o la cabecera de una categoría; no afirma
 * ser la fotografía de un producto exacto.
 */
export const editorialMediaContexts = [
  'article',
  'guide',
  'category-hero',
  'home',
] as const;

/**
 * Convención de dominio para fotografía editorial "real" (propia o de un
 * banco con licencia comercial), deliberadamente separada de
 * `ProductMedia` (Fase 4/7/8). La diferencia importa porque son promesas
 * distintas al lector:
 *  - `ProductMedia` dice "esto es una foto/imagen autorizada de ESTE
 *    producto exacto".
 *  - `EditorialMedia` dice "esta es una foto editorial que ilustra un
 *    tema", p. ej. una manicurista usando un torno en el artículo "cómo
 *    usar un torno" — nunca debe presentarse como "foto del Kredioo 35000
 *    RPM" si no lo es. Por eso este esquema, a propósito, no tiene
 *    `productId` ni ningún campo que la vincule a una ficha concreta.
 *
 * Todavía no hay ningún archivo real bajo `public/editorial/` — este
 * esquema y `EditorialImage.astro` quedan preparados para cuando exista
 * fotografía propia o de banco con licencia comercial confirmada; no se ha
 * copiado ninguna imagen de Internet para poblarlo.
 */
export const editorialMediaSchema = z.object({
  id: z.string().min(1),
  localPath: z
    .string()
    .regex(/^\/editorial\//, 'localPath debe vivir bajo /editorial/'),
  alt: z.string().min(1).max(200),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  context: z.enum(editorialMediaContexts),
  /** Texto de atribución/licencia cuando la fuente lo exige (p. ej. banco de imágenes); vacío si es fotografía propia sin requisito de crédito. */
  attribution: z.string().max(300).optional(),
  lastVerifiedAt: z.iso.date().optional(),
});

export type EditorialMedia = z.infer<typeof editorialMediaSchema>;
