/**
 * Sincroniza el media oficial de Amazon Creators API con el catálogo y deja
 * el resultado en `src/data/generated/amazon-media-snapshot.json`.
 *
 * Es el único punto de todo el proyecto que habla con Amazon, y lo hace
 * ANTES del build. Consecuencias buscadas:
 *  - Las páginas siguen siendo `prerender = true`: el SEO estático no cambia.
 *  - El Worker nunca llama a Amazon, así que una caída de Amazon no puede
 *    producir un 500 en producción; como mucho, el build siguiente se queda
 *    sin imágenes nuevas y se sirve el fallback editorial.
 *  - Las credenciales solo existen en el proceso de build (entorno local o
 *    Secrets de CI), nunca en el runtime de Cloudflare ni en el bundle.
 *
 * Uso:
 *   AMAZON_CREATORS_API_ENABLED=true npm run amazon:sync
 *   npm run amazon:sync -- --dry-run     (no escribe el snapshot)
 *
 * Nunca imprime, ni parcialmente, el credential id ni el secreto.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

import { mapCreatorsApiItem } from '../src/application/amazon/creatorsMediaMapper';
import {
  CREATORS_API_CACHE_TTL_MS,
  CREATORS_API_ENV_VARS,
  CREATORS_API_MARKETPLACE_HOSTS,
  CREATORS_API_MAX_ITEM_IDS,
} from '../src/config/amazonCreators';
import { AMAZON_CONFIG } from '../src/config/site';
import { loadAmazonMediaSnapshot } from '../src/data/amazonMediaSnapshot';
import { PRODUCTS } from '../src/data/products';
import { errorItemId } from '../src/domain/amazonCreators';
import type {
  AmazonMediaSnapshot,
  AmazonMediaSnapshotEntry,
} from '../src/domain/amazonMediaSnapshot';
import { createCreatorsApiClient } from '../src/infrastructure/amazon/creatorsApiClient';
import {
  describeCredentials,
  readCreatorsApiCredentials,
} from '../src/infrastructure/amazon/credentials';
import { createCreatorsApiTokenProvider } from '../src/infrastructure/amazon/tokenProvider';

const SNAPSHOT_PATH = resolve('src/data/generated/amazon-media-snapshot.json');
const MARKETPLACE = CREATORS_API_MARKETPLACE_HOSTS[AMAZON_CONFIG.marketplace];
const dryRun = process.argv.includes('--dry-run');

/**
 * Carga `.dev.vars` si existe, sin dependencias y sin imprimir valores. Es
 * el fichero que usa Wrangler para el entorno local, y el sitio recomendado
 * para las credenciales en una máquina de desarrollo (está en `.gitignore`).
 */
function loadDevVars(): void {
  const path = resolve('.dev.vars');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match?.[1] || line.trimStart().startsWith('#')) continue;
    const value = (match[2] ?? '').replace(/^["']|["']$/g, '');
    process.env[match[1]] ??= value;
  }
  console.log('· Cargado .dev.vars (valores no se imprimen).');
}

function writeSnapshot(snapshot: AmazonMediaSnapshot): void {
  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  const temporary = `${SNAPSHOT_PATH}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
  /** Escritura atómica: un build concurrente nunca ve un JSON a medias. */
  renameSync(temporary, SNAPSHOT_PATH);
}

function emptySnapshot(): AmazonMediaSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    marketplace: MARKETPLACE,
    partnerTag: AMAZON_CONFIG.affiliateTag,
    amazonQueried: false,
    entries: [],
  };
}

async function main(): Promise<number> {
  loadDevVars();

  const eligible = PRODUCTS.filter(
    (product) =>
      product.asin !== undefined &&
      product.active &&
      product.affiliateEligible &&
      product.editorialStatus === 'approved',
  );

  console.log('AMAZON CREATORS API — SYNC');
  console.log('');
  console.log(`Marketplace: ${MARKETPLACE}`);
  console.log(`Partner tag: ${AMAZON_CONFIG.affiliateTag}`);
  console.log(`Productos elegibles con ASIN: ${String(eligible.length)}`);

  const enabled = process.env[CREATORS_API_ENV_VARS.enabled] === 'true';
  if (!enabled) {
    console.log('');
    console.log(
      `${CREATORS_API_ENV_VARS.enabled} no está a "true": no se consulta Amazon y se escribe un snapshot vacío. Todo el catálogo usará el fallback editorial.`,
    );
    if (!dryRun) writeSnapshot(emptySnapshot());
    return 0;
  }

  const credentialsResult = readCreatorsApiCredentials();
  if (!credentialsResult.ok) {
    console.error('');
    console.error(
      `ERROR: ${CREATORS_API_ENV_VARS.enabled} está activo pero ${credentialsResult.reason}`,
    );
    console.error(
      'Define las credenciales en .dev.vars (local) o en los Secrets del CI. No se sobrescribe el snapshot existente.',
    );
    return 1;
  }
  console.log(
    `Credenciales: ${describeCredentials(credentialsResult.credentials)}`,
  );

  const previous = loadAmazonMediaSnapshot(
    existsSync(SNAPSHOT_PATH)
      ? JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'))
      : null,
    Date.now(),
    CREATORS_API_CACHE_TTL_MS,
  );

  const tokenProvider = createCreatorsApiTokenProvider({
    credentials: credentialsResult.credentials,
  });
  const client = createCreatorsApiClient({
    tokenProvider,
    marketplace: MARKETPLACE,
    partnerTag: AMAZON_CONFIG.affiliateTag,
  });

  const asins = eligible.map((product) => product.asin as string);
  const productByAsin = new Map(
    eligible.map((product) => [product.asin as string, product]),
  );

  console.log(
    `Lotes de hasta ${String(CREATORS_API_MAX_ITEM_IDS)} ASINs: ${String(Math.ceil(asins.length / CREATORS_API_MAX_ITEM_IDS))} petición(es) GetItems + 1 token.`,
  );
  console.log('');

  const outcomes = await client.getItems(asins);

  const entries: AmazonMediaSnapshotEntry[] = [];
  const withImage: string[] = [];
  const failures: { asin: string; productId: string; reason: string }[] = [];
  const warnings: string[] = [];
  const reusedFromCache: string[] = [];
  const answered = new Set<string>();
  let requestCount = 0;

  for (const outcome of outcomes) {
    requestCount += outcome.attempts;
    if (outcome.failure) {
      /** Fallo COMPLETO del lote: ningún item devuelto. */
      for (const asin of outcome.asins) {
        answered.add(asin.toUpperCase());
        const product = productByAsin.get(asin);
        const stillFresh = previous.byAsin.get(asin.toUpperCase());
        if (stillFresh && product && stillFresh.productId === product.id) {
          entries.push(stillFresh);
          reusedFromCache.push(asin);
          continue;
        }
        failures.push({
          asin,
          productId: product?.id ?? '(desconocido)',
          reason: `lote fallido (${outcome.failure.kind}, ${String(outcome.failure.attempts)} intento(s)): ${outcome.failure.message}`,
        });
      }
      continue;
    }

    /** Errores PARCIALES: Amazon respondió, pero rechazó algunos ASINs. */
    const errorByAsin = new Map<string, string>();
    const globalErrors: string[] = [];
    for (const error of outcome.errors) {
      const id = errorItemId(error);
      if (id)
        errorByAsin.set(id.toUpperCase(), `${error.code}: ${error.message}`);
      else globalErrors.push(`${error.code}: ${error.message}`);
    }

    for (const item of outcome.items) {
      const product = productByAsin.get(item.asin.toUpperCase());
      answered.add(item.asin.toUpperCase());
      if (!product) {
        warnings.push(
          `Amazon devolvió el ASIN ${item.asin}, que no se pidió ni está en el catálogo; se ignora.`,
        );
        continue;
      }
      const mapped = mapCreatorsApiItem({
        product,
        item,
        fetchedAt: new Date().toISOString(),
      });
      if (!mapped.ok) {
        failures.push({
          asin: item.asin,
          productId: product.id,
          reason: `${mapped.rejection.reason}: ${mapped.rejection.detail}`,
        });
        continue;
      }
      warnings.push(...mapped.warnings);
      entries.push(mapped.entry);
      withImage.push(mapped.entry.asin);
    }

    for (const asin of outcome.asins) {
      if (answered.has(asin.toUpperCase())) continue;
      answered.add(asin.toUpperCase());
      const product = productByAsin.get(asin);
      const detail =
        errorByAsin.get(asin.toUpperCase()) ??
        (globalErrors.length > 0
          ? globalErrors.join(' | ')
          : 'Amazon no devolvió este ASIN ni un error explícito para él.');
      failures.push({
        asin,
        productId: product?.id ?? '(desconocido)',
        reason: detail,
      });
    }
  }

  const snapshot: AmazonMediaSnapshot = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    marketplace: MARKETPLACE,
    partnerTag: AMAZON_CONFIG.affiliateTag,
    amazonQueried: true,
    entries,
  };

  console.log('RESULTADO');
  console.log('');
  console.log(`ASINs consultados: ${String(asins.length)}`);
  console.log(
    `Peticiones HTTP a GetItems (incl. reintentos): ${String(requestCount)}`,
  );
  console.log(`Con imagen oficial nueva: ${String(withImage.length)}`);
  console.log(
    `Reutilizados del snapshot fresco anterior: ${String(reusedFromCache.length)}`,
  );
  console.log(`Sin imagen utilizable: ${String(failures.length)}`);
  console.log(
    `Con detailPageURL oficial válida: ${String(entries.filter((entry) => entry.detailPageURL).length)}`,
  );
  console.log('');

  if (failures.length > 0) {
    console.log('PRODUCTOS SIN IMAGEN (usarán fallback editorial):');
    for (const failure of failures)
      console.log(
        `  · ${failure.productId} [${failure.asin}] — ${failure.reason}`,
      );
    console.log('');
  }
  if (warnings.length > 0) {
    console.log('AVISOS:');
    for (const warning of [...new Set(warnings)]) console.log(`  · ${warning}`);
    console.log('');
  }

  if (dryRun) {
    console.log('--dry-run: no se ha escrito el snapshot.');
    return 0;
  }

  if (entries.length === 0 && previous.byAsin.size > 0) {
    console.error(
      'ERROR: el sync no obtuvo ninguna entrada y ya existía un snapshot fresco. No se sobrescribe, para no perder imágenes válidas por una caída puntual de Amazon.',
    );
    return 1;
  }

  writeSnapshot(snapshot);
  console.log(`Snapshot escrito: ${SNAPSHOT_PATH}`);
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    /** Nunca se imprime el error crudo si pudiera contener cabeceras/credenciales. */
    console.error(
      `ERROR inesperado en el sync: ${error instanceof Error ? error.message : 'desconocido'}`,
    );
    process.exitCode = 1;
  });
