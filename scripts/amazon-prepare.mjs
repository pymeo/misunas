/**
 * Garantiza que existe `src/data/generated/amazon-media-snapshot.json`.
 *
 * El snapshot real lo escribe `npm run amazon:sync` y está fuera de Git (la
 * política de caching de Amazon autoriza 1 día, así que versionarlo lo
 * dejaría fuera de norma). Pero `src/data/amazonMediaSnapshot.ts` lo importa
 * de forma estática, así que un checkout limpio necesita un fichero vacío
 * para que `npm ci && npm run build` funcione sin credenciales.
 *
 * Deliberadamente en .mjs sin dependencias: lo ejecuta el lifecycle `prepare`
 * de npm, que corre durante `npm ci`, cuando tsx puede no estar listo.
 * Idempotente: si ya hay un snapshot (vacío o real), no lo toca.
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const target = resolve('src/data/generated/amazon-media-snapshot.json');

if (existsSync(target)) process.exit(0);

mkdirSync(dirname(target), { recursive: true });
writeFileSync(
  target,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date(0).toISOString(),
      marketplace: 'www.amazon.es',
      partnerTag: 'tusunas-21',
      amazonQueried: false,
      entries: [],
    },
    null,
    2,
  )}\n`,
);
console.log(
  'amazon:prepare — creado snapshot vacío en src/data/generated/amazon-media-snapshot.json (sin datos de Amazon).',
);
