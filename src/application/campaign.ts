import { z } from 'zod';
import type { CampaignAttribution } from '@/application/campaignAttribution';

export type { CampaignAttribution } from '@/application/campaignAttribution';

/** Validación server-side (Zod) del UTM que llega en un POST no fiable. Para leer/sanear la URL en el cliente, usa `readCampaignAttribution` en `@/application/campaignAttribution` (sin Zod, para no arrastrarlo al bundle del navegador). */
export const campaignSchema = z.object({
  utmSource: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[\p{L}\p{N} ._~-]+$/u)
    .optional(),
  utmMedium: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[\p{L}\p{N} ._~-]+$/u)
    .optional(),
  utmCampaign: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[\p{L}\p{N} ._~-]+$/u)
    .optional(),
  utmContent: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[\p{L}\p{N} ._~-]+$/u)
    .optional(),
});

export function campaignToMetadata(
  campaign?: CampaignAttribution,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(campaign ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}
