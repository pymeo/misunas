import { z } from 'zod';

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
export type CampaignAttribution = z.infer<typeof campaignSchema>;

export function readCampaignAttribution(search: string): CampaignAttribution {
  const params = new URLSearchParams(search);
  const clean = (name: string) =>
    params
      .get(name)
      ?.trim()
      .slice(0, 100)
      .replace(/[^\p{L}\p{N} ._~-]/gu, '') || undefined;
  const candidate = {
    utmSource: clean('utm_source'),
    utmMedium: clean('utm_medium'),
    utmCampaign: clean('utm_campaign'),
    utmContent: clean('utm_content'),
  };
  return campaignSchema.parse(candidate);
}

export function campaignToMetadata(campaign?: CampaignAttribution): Record<string, string> {
  return Object.fromEntries(Object.entries(campaign ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}
