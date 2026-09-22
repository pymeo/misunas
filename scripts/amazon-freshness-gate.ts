/**
 * Puerta de despliegue: impide que `npm run deploy` publique datos de Amazon
 * fuera de la política de caching oficial (1 día para Images, ItemInfo y
 * DetailPageURL).
 *
 * Corre entre el build y `wrangler deploy`. Bloquea en tres casos:
 *  1. La integración está activa pero el snapshot no contiene datos de
 *     Amazon — se publicaría un sitio sin las imágenes que se esperan, casi
 *     siempre por un sync que falló y pasó desapercibido.
 *  2. Alguna entrada supera la TTL de 24 h.
 *  3. El snapshot completo (`generatedAt`) supera la TTL.
 *
 * Cuando la integración está desactivada no bloquea nada: un snapshot vacío
 * es el estado legítimo de un build sin Amazon.
 */
// Primer import a propósito: deja `.dev.vars` en process.env antes de que
// cualquier otro módulo lea AMAZON_CREATORS_API_ENABLED al evaluarse.
import './lib/devVars';

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CREATORS_API_CACHE_TTL_MS,
  CREATORS_API_ENV_VARS,
} from '../src/config/amazonCreators';
import { loadAmazonMediaSnapshot } from '../src/data/amazonMediaSnapshot';

const SNAPSHOT_PATH = resolve('src/data/generated/amazon-media-snapshot.json');
const enabled = process.env[CREATORS_API_ENV_VARS.enabled] === 'true';

function fail(message: string): never {
  console.error(`amazon:gate — BLOQUEADO: ${message}`);
  process.exit(1);
}

if (!existsSync(SNAPSHOT_PATH)) {
  if (enabled)
    fail(
      'no existe el snapshot de Amazon y la integración está activa. Ejecuta "npm run amazon:sync".',
    );
  console.log(
    'amazon:gate — OK: integración desactivada y sin snapshot; el sitio usará el fallback editorial.',
  );
  process.exit(0);
}

const loaded = loadAmazonMediaSnapshot(
  JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')),
  Date.now(),
  CREATORS_API_CACHE_TTL_MS,
);

if (!loaded.snapshot)
  fail(loaded.problem ?? 'el snapshot de Amazon no es legible.');

const hours = (ms: number): string => (ms / 3_600_000).toFixed(1);
const age = Date.now() - Date.parse(loaded.snapshot.generatedAt);

if (loaded.staleAsins.length > 0)
  fail(
    `${String(loaded.staleAsins.length)} entrada(s) superan la TTL de ${hours(CREATORS_API_CACHE_TTL_MS)} h autorizada por Amazon (${loaded.staleAsins.join(', ')}). Ejecuta "npm run amazon:sync" antes de desplegar.`,
  );

if (!loaded.snapshot.amazonQueried) {
  if (enabled)
    fail(
      `${CREATORS_API_ENV_VARS.enabled} está activo pero el snapshot no contiene datos de Amazon (amazonQueried: false). Ejecuta "npm run amazon:sync" y revisa su informe antes de desplegar.`,
    );
  console.log(
    'amazon:gate — OK: integración desactivada; snapshot vacío es el estado esperado.',
  );
  process.exit(0);
}

if (age > CREATORS_API_CACHE_TTL_MS)
  fail(
    `el snapshot se generó hace ${hours(age)} h, por encima de la TTL de ${hours(CREATORS_API_CACHE_TTL_MS)} h. Ejecuta "npm run amazon:sync".`,
  );

/**
 * No bloquea: un sitio con fallback editorial es válido, y bloquear aquí
 * dejaría el despliegue rehén de una caída de Amazon. Pero que se consulte
 * Amazon y no quede ni una imagen es casi siempre un problema de credencial
 * o de partnerTag, así que se avisa en voz alta.
 */
if (loaded.snapshot.entries.length === 0)
  console.warn(
    'amazon:gate — AVISO: se consultó Amazon y no quedó ninguna entrada. Todo el catálogo usará el fallback editorial. Revisa el informe de "npm run amazon:sync" (credencial sin acceso a Creators API, partnerTag que no corresponde o marketplace no autorizado son las causas habituales).',
  );

console.log(
  `amazon:gate — OK: ${String(loaded.snapshot.entries.length)} entrada(s) de Amazon, generadas hace ${hours(age)} h (límite ${hours(CREATORS_API_CACHE_TTL_MS)} h).`,
);
