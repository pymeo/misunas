/**
 * Feature flag de Amazon Creators API (ver `productMediaResolver.ts`,
 * Fase 5). Desactivado por defecto: sin credenciales todavía, así que debe
 * quedarse en `false` en todos los entornos hasta que se conecte la
 * integración real. Mientras esté a `false`, el provider no realiza
 * ninguna llamada ni consulta de caché.
 *
 * `import.meta.env` solo lo inyecta Vite; scripts ejecutados directamente
 * con `tsx` (como `scripts/media-audit.ts`) no pasan por Vite, así que hay
 * que protegerse de que venga `undefined` en ese contexto aunque los tipos
 * ambientales de Vite lo den por garantizado.
 */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
const rawCreatorsApiFlag: unknown = import.meta.env
  ?.AMAZON_CREATORS_API_ENABLED;
/* eslint-enable @typescript-eslint/no-unnecessary-condition */

export const AMAZON_CREATORS_API_ENABLED: boolean =
  rawCreatorsApiFlag === 'true';
