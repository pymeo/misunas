/**
 * Feature flag de Amazon Creators API. Mientras esté a `false`,
 * `creatorsApiMediaProvider` no consulta el snapshot ni resuelve ninguna
 * imagen remota, y todo el catálogo usa el fallback editorial — el
 * comportamiento anterior a la integración, intacto.
 *
 * Se lee de dos sitios porque hay dos entornos de ejecución reales:
 *  - `import.meta.env`: lo inyecta Vite durante `astro build` (prerender).
 *  - `process.env`: los scripts ejecutados con `tsx`
 *    (`scripts/amazon-sync.ts`, `scripts/media-audit.ts`) no pasan por Vite.
 * Si las dos fuentes discrepasen, gana la variable explícita del proceso:
 * es la que fija quien lanza el comando.
 */
/**
 * `import.meta.env` está tipado como siempre presente por los tipos
 * ambientales de Vite, pero en un script ejecutado con `tsx` no lo está —
 * de ahí el optional chaining y el silenciado puntual de la regla.
 */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
const fromVite: unknown = import.meta.env?.AMAZON_CREATORS_API_ENABLED;
/* eslint-enable @typescript-eslint/no-unnecessary-condition */
const fromProcess: unknown =
  typeof process === 'undefined'
    ? undefined
    : process.env.AMAZON_CREATORS_API_ENABLED;

export const AMAZON_CREATORS_API_ENABLED: boolean =
  (fromProcess ?? fromVite) === 'true';
