/**
 * Sin dependencia de Zod a propósito: `readCampaignAttribution` se importa
 * desde `<script>` de cliente (AmazonCTA, calculadoras, recomendador) —
 * prácticamente toda página comercial — y antes vivía en el mismo módulo
 * que `campaignSchema` (Zod), así que el bundler no podía separar los ~64KB
 * de Zod del resto. La validación "de verdad" ante un POST no fiable sigue
 * viviendo en `campaignSchema` (`@/application/campaign.ts`, solo
 * server-side); aquí solo se sanea lo que ya viene de la propia URL del
 * navegador, con las mismas reglas (máx. 100 caracteres, mismo alfabeto).
 */
export interface CampaignAttribution {
  utmSource?: string | undefined;
  utmMedium?: string | undefined;
  utmCampaign?: string | undefined;
  utmContent?: string | undefined;
}

const DISALLOWED_CHARS = /[^\p{L}\p{N} ._~-]/gu;

export function readCampaignAttribution(search: string): CampaignAttribution {
  const params = new URLSearchParams(search);
  const clean = (name: string) =>
    params.get(name)?.trim().slice(0, 100).replace(DISALLOWED_CHARS, '') ||
    undefined;
  return {
    utmSource: clean('utm_source'),
    utmMedium: clean('utm_medium'),
    utmCampaign: clean('utm_campaign'),
    utmContent: clean('utm_content'),
  };
}
