import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carga `.dev.vars` en `process.env`.
 *
 * `.dev.vars` es el fichero de entorno local de Wrangler (ignorado por Git) y
 * el sitio recomendado para las credenciales de Creators API en una máquina de
 * desarrollo. Lo leen dos mundos distintos:
 *
 *  - `astro build` lo recoge solo, a través del platform proxy de Wrangler que
 *    usa `@astrojs/cloudflare` — comprobado: sin `.dev.vars` el build produce 0
 *    imágenes remotas, con él las produce.
 *  - Los scripts ejecutados con `tsx` (`amazon-sync`, `media-audit`,
 *    `affiliate-audit`, `amazon-freshness-gate`) NO pasan por Astro ni por
 *    Wrangler, así que tienen que cargarlo explícitamente. Sin esto,
 *    `media:audit` informaba "Integration enabled: no" y "0 imágenes" con un
 *    snapshot de 34 entradas que el build sí iba a renderizar.
 *
 * IMPORTANTE: este módulo se importa por su efecto secundario y debe ser el
 * PRIMER import del script. `src/config/media.ts` calcula
 * `AMAZON_CREATORS_API_ENABLED` al evaluarse, así que una llamada dentro del
 * cuerpo del script llegaría tarde: ESM evalúa los imports antes.
 *
 * Nunca imprime valores: solo los nombres de las variables cargadas.
 */
export function loadDevVars(path = resolve('.dev.vars')): string[] {
  if (!existsSync(path)) return [];
  const loaded: string[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trimStart().startsWith('#')) continue;
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    const name = match?.[1];
    if (!name) continue;
    /**
     * Una variable ya presente en el entorno gana: es la que ha fijado quien
     * lanza el comando (o el CI), y debe poder sobreescribir el fichero local.
     */
    if (process.env[name] !== undefined) continue;
    process.env[name] = (match[2] ?? '').replace(/^["']|["']$/g, '');
    loaded.push(name);
  }
  return loaded;
}

const names = loadDevVars();
if (names.length > 0)
  console.log(
    `· .dev.vars cargado (${String(names.length)} variables: ${names.join(', ')}; valores no se imprimen).`,
  );
