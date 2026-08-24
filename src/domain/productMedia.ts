import { z } from 'zod';

export const mediaSourceTypes = [
  'amazon_official',
  'brand_official',
  'brand_media_kit',
  'brand_pim',
  'own',
  'ugc',
  'editorial',
] as const;

export const mediaUsageBases = [
  'amazon_affiliate_asset',
  'manufacturer_authorized',
  'manufacturer_media_kit',
  'manufacturer_pim_authorized',
  'owned',
  'user_submitted',
  'original_editorial',
] as const;

export const mediaStatuses = ['approved', 'candidate', 'rejected'] as const;

/**
 * Estado del derecho de uso, independiente de `status` (que es la decisión
 * editorial de mostrarlo). Permite responder "¿por qué tenemos derecho a
 * mostrar esta imagen?" sin rebuscar en notas de texto libre.
 * - `not_required`: contenido propio o editorial nuestro; no hace falta
 *   licencia de terceros.
 * - `needs_permission`: fuente de marca/Amazon localizada pero sin permiso
 *   explícito todavía — el estado por defecto de un `candidate`.
 * - `permission_requested`: ya se ha contactado a la marca/plataforma.
 * - `permission_granted`: hay evidencia concreta (email, media kit con
 *   licencia explícita, respuesta oficial de una API) de que podemos usarla.
 */
export const mediaRightsStatuses = [
  'not_required',
  'needs_permission',
  'permission_requested',
  'permission_granted',
] as const;

/**
 * Cómo se serviría la imagen al navegador si llega a aprobarse. Sustituye al
 * antiguo modelo implícito "approved implica localPath": hoy toda imagen
 * autoalojada sigue viviendo bajo `public/products/` (única vía compatible
 * con la CSP actual, `img-src 'self' data:`), pero Amazon Creators API (ver
 * `productMediaResolver.ts`) nunca autoriza descargar y autoalojar sus
 * imágenes — solo servirlas dinámicamente desde su propia URL. `delivery`
 * modela esa diferencia como discriminated union en vez de un campo
 * ambiguo: una entrada `remote` siempre trae su `imageUrl` (candidata o no,
 * porque esa URL *es* la evidencia de investigación), y una entrada `local`
 * exige `localPath` en cuanto pasa a `approved` (antes, en fase `candidate`,
 * puede no tener aún ningún archivo descargado — ver el superRefine). Una
 * entrada `remote` con `status: 'approved'` solo se podrá pintar de verdad
 * el día en que su host figure en la allowlist de `img-src` (Fase 6); hasta
 * entonces el resolver la debe tratar igual que si no existiera.
 */
export const mediaDeliveryKinds = ['local', 'remote'] as const;

const productMediaCommonSchema = z.object({
  productId: z.string().min(1),
  sourceType: z.enum(mediaSourceTypes),
  /** Referencia de investigación (candidate) o, en remote, la URL servida en render. */
  imageUrl: z.url().optional(),
  sourcePage: z.url().optional(),
  exactProductMatch: z.boolean(),
  usageBasis: z.enum(mediaUsageBases),
  alt: z.string().min(1).max(200),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  lastVerifiedAt: z.iso.date().optional(),
  status: z.enum(mediaStatuses),
  rightsStatus: z.enum(mediaRightsStatuses),
  /** Referencia corta a la evidencia del permiso (p. ej. "email 2026-08-24 a affiliate@marca.com"), no el contenido íntegro. */
  rightsEvidence: z.string().max(300).optional(),
  approvedAt: z.iso.date().optional(),
  /** Rol/equipo que aprobó, nunca un nombre personal (p. ej. "equipo editorial"). */
  approvedBy: z.string().max(120).optional(),
  /** Nota interna de investigación; nunca se renderiza en la UI. */
  note: z.string().max(400).optional(),
});

const localProductMediaSchema = productMediaCommonSchema.extend({
  delivery: z.literal('local'),
  /**
   * Ausente durante la investigación (`candidate`/`rejected`); obligatorio
   * en cuanto `status` pasa a `approved` — ver superRefine más abajo.
   */
  localPath: z
    .string()
    .regex(/^\/products\//, 'localPath debe vivir bajo /products/')
    .optional(),
});

const remoteProductMediaSchema = productMediaCommonSchema.extend({
  delivery: z.literal('remote'),
  imageUrl: z.url(),
});

export const productMediaSchema = z
  .discriminatedUnion('delivery', [
    localProductMediaSchema,
    remoteProductMediaSchema,
  ])
  .superRefine((media, context) => {
    if (
      media.delivery === 'local' &&
      media.status === 'approved' &&
      !media.localPath
    )
      context.addIssue({
        code: 'custom',
        path: ['localPath'],
        message:
          'Una entrada local approved necesita localPath (asset autoalojado); un imageUrl remoto no basta por la CSP actual.',
      });
    if (
      media.status === 'approved' &&
      media.rightsStatus !== 'permission_granted' &&
      media.rightsStatus !== 'not_required'
    )
      context.addIssue({
        code: 'custom',
        path: ['rightsStatus'],
        message:
          'No se puede aprobar una imagen cuyo derecho de uso no está confirmado (permission_granted) o no aplica (not_required).',
      });
    if (
      media.sourceType !== 'editorial' &&
      media.sourceType !== 'own' &&
      media.sourceType !== 'ugc' &&
      !media.sourcePage &&
      !media.imageUrl
    )
      context.addIssue({
        code: 'custom',
        path: ['sourcePage'],
        message: 'Toda fuente externa necesita una referencia de origen.',
      });
    /**
     * UGC (foto enviada por una usuaria) todavía no tiene flujo de
     * moderación implementado — Fase 8. Bloqueamos su publicación aquí, a
     * nivel de esquema, para que no dependa de que nadie recuerde no
     * aprobarla desde la vista mientras esa moderación no exista.
     */
    if (media.sourceType === 'ugc' && media.status === 'approved')
      context.addIssue({
        code: 'custom',
        path: ['sourceType'],
        message:
          'El contenido enviado por usuarias (ugc) todavía no tiene moderación implementada: no puede marcarse approved.',
      });
  });

export type ProductMedia = z.infer<typeof productMediaSchema>;
export type LocalProductMedia = z.infer<typeof localProductMediaSchema>;
export type RemoteProductMedia = z.infer<typeof remoteProductMediaSchema>;
