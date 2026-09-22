import { z } from 'zod';

/**
 * Contrato de Amazon Creators API modelado con Zod. Todo lo que entra por
 * red se valida aquí antes de tocar el dominio de Tus-Uñas: la API es de un
 * tercero y una respuesta inesperada debe degradar al fallback editorial, no
 * propagar `undefined` hasta una plantilla.
 *
 * Los campos opcionales son opcionales de verdad: Amazon omite recursos que
 * no tiene para un ASIN concreto (un producto sin fotografía no trae
 * `images`). Nunca se rellena un atributo ausente con un valor inventado.
 */

export const creatorsApiTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  /** Amazon devuelve "bearer"; se compara en minúsculas. */
  token_type: z.string().min(1),
  /** Segundos de vida del token (3600 en la práctica). */
  expires_in: z.number().int().positive(),
});

export type CreatorsApiTokenResponse = z.infer<
  typeof creatorsApiTokenResponseSchema
>;

const imageSchema = z.object({
  url: z.url(),
  height: z.number().int().positive(),
  width: z.number().int().positive(),
});

const imageSetSchema = z.object({ large: imageSchema.optional() });

const imagesSchema = z.object({
  primary: imageSetSchema.optional(),
  /**
   * Amazon documenta `variants` como el mismo bloque repetido por variante.
   * En la práctica llega como array; se acepta también el objeto único para
   * no romper si cambia la forma.
   */
  variants: z
    .union([z.array(imageSetSchema), imageSetSchema])
    .optional()
    .transform((value) =>
      value === undefined ? [] : Array.isArray(value) ? value : [value],
    ),
});

const displayValueSchema = z.object({ displayValue: z.string().min(1) });
const displayValuesSchema = z.object({
  displayValues: z.array(z.string().min(1)),
});

const itemInfoSchema = z.object({
  title: displayValueSchema.optional(),
  byLineInfo: z
    .object({
      brand: displayValueSchema.optional(),
      manufacturer: displayValueSchema.optional(),
    })
    .optional(),
  features: displayValuesSchema.optional(),
});

export const creatorsApiItemSchema = z.object({
  asin: z.string().min(1),
  detailPageURL: z.url().optional(),
  images: imagesSchema.optional(),
  itemInfo: itemInfoSchema.optional(),
  parentASIN: z.string().min(1).optional(),
});

export type CreatorsApiItem = z.infer<typeof creatorsApiItemSchema>;

/**
 * Error de GetItems. Amazon lo usa tanto para fallos globales (credencial
 * inválida, marketplace no autorizado) como para fallos parciales de un ASIN
 * concreto; en el segundo caso el objeto suele traer el identificador, pero
 * el nombre del campo no está garantizado, así que se aceptan las variantes
 * conocidas y se normaliza fuera.
 */
export const creatorsApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  itemId: z.string().min(1).optional(),
  asin: z.string().min(1).optional(),
});

export type CreatorsApiError = z.infer<typeof creatorsApiErrorSchema>;

const itemResultsSchema = z.object({
  items: z.array(creatorsApiItemSchema).optional(),
});

/**
 * Sobre de la respuesta. La documentación de la operación lo nombra
 * `itemResults` y la guía de migración desde PA-API lo nombra `itemsResult`
 * (el nombre heredado de PA-API 5.0). Se aceptan ambos y se normaliza: es
 * una discrepancia real de la documentación oficial, no una suposición, y
 * elegir solo uno dejaría la integración a merced de cuál sirva Amazon.
 */
export const creatorsApiGetItemsResponseSchema = z
  .object({
    itemResults: itemResultsSchema.optional(),
    itemsResult: itemResultsSchema.optional(),
    errors: z.array(creatorsApiErrorSchema).optional(),
  })
  .transform((response) => ({
    items: response.itemResults?.items ?? response.itemsResult?.items ?? [],
    errors: response.errors ?? [],
  }));

export interface CreatorsApiGetItemsResult {
  items: CreatorsApiItem[];
  errors: CreatorsApiError[];
}

/** ASIN al que apunta un error parcial, si la respuesta lo identifica. */
export function errorItemId(error: CreatorsApiError): string | null {
  return error.itemId ?? error.asin ?? null;
}
