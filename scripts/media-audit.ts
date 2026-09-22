// Primer import a propósito: deja `.dev.vars` en process.env antes de que
// cualquier otro módulo lea AMAZON_CREATORS_API_ENABLED al evaluarse.
import './lib/devVars';

import {
  getAmazonImageVariants,
  getMediaSrc,
  getProductMedia,
} from '../src/application/productMediaResolver';
import { AMAZON_CREATORS_API_ENABLED } from '../src/config/media';
import { AMAZON_MEDIA_SNAPSHOT } from '../src/data/amazonMediaSnapshot';
import { getMediaEntries } from '../src/data/productMedia';
import { PRODUCTS } from '../src/data/products';

type Bucket = 'REAL' | 'CANDIDATE' | 'EDITORIAL' | 'ERROR';

interface AuditRow {
  id: string;
  label: string;
  bucket: Bucket;
  detail: string;
}

const activeProducts = PRODUCTS.filter(
  (product) => product.active && product.editorialStatus === 'approved',
);

const rows: AuditRow[] = activeProducts.map((product) => {
  const label = `${product.brand} — ${product.name} (${product.id})`;
  try {
    const resolved = getProductMedia(product);
    if (resolved.kind === 'image')
      return {
        id: product.id,
        label,
        bucket: 'REAL',
        detail: `${resolved.media.sourceType} (${resolved.media.delivery}) · ${getMediaSrc(resolved.media)}`,
      };
    const candidate = getMediaEntries(product.id).find(
      (entry) => entry.status === 'candidate',
    );
    if (candidate)
      return {
        id: product.id,
        label,
        bucket: 'CANDIDATE',
        detail: `${candidate.sourceType} · ${candidate.sourcePage ?? candidate.imageUrl ?? 'sin URL'}`,
      };
    const illustration =
      product.productType === 'nail_drill' ||
      product.productType === 'nail_dust_collector'
        ? 'ToolIllustration'
        : product.productType === 'nail_printer_3d'
          ? 'NailPrinterIllustration'
          : 'NailStylePreview';
    return {
      id: product.id,
      label,
      bucket: 'EDITORIAL',
      detail: `Fallback editorial (${illustration})`,
    };
  } catch (error) {
    return {
      id: product.id,
      label,
      bucket: 'ERROR',
      detail: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
});

const counts: Record<Bucket, number> = {
  REAL: 0,
  CANDIDATE: 0,
  EDITORIAL: 0,
  ERROR: 0,
};
for (const row of rows) counts[row.bucket] += 1;

const withAsin = activeProducts.filter((product) => product.asin);
const amazonSourced = rows.filter((row) =>
  row.detail.includes('amazon_official'),
);
const withVariants = activeProducts.filter(
  (product) => getAmazonImageVariants(product).length > 0,
);

console.log('PRODUCT MEDIA AUDIT');
console.log('');
console.log(`Total products: ${activeProducts.length}`);
console.log(`With ASIN: ${withAsin.length}`);
console.log('');
console.log('AMAZON CREATORS API');
console.log(
  `  Integration enabled: ${AMAZON_CREATORS_API_ENABLED ? 'yes' : 'no'}`,
);
console.log(
  `  Snapshot: ${
    AMAZON_MEDIA_SNAPSHOT.snapshot === null
      ? 'ausente o inválido'
      : AMAZON_MEDIA_SNAPSHOT.snapshot.amazonQueried
        ? `generado ${AMAZON_MEDIA_SNAPSHOT.snapshot.generatedAt}`
        : 'vacío (sin consultar Amazon)'
  }`,
);
console.log(`  Fresh snapshot entries: ${AMAZON_MEDIA_SNAPSHOT.byAsin.size}`);
console.log(
  `  Stale (ignored) entries: ${AMAZON_MEDIA_SNAPSHOT.staleAsins.length}`,
);
console.log(`  Products showing an Amazon image: ${amazonSourced.length}`);
console.log(
  `  Products with an Amazon variant gallery: ${withVariants.length}`,
);
console.log(
  `  Products falling back to editorial: ${withAsin.length - amazonSourced.length}`,
);
if (AMAZON_MEDIA_SNAPSHOT.problem)
  console.log(`  Aviso: ${AMAZON_MEDIA_SNAPSHOT.problem}`);
console.log('');
console.log(`Real approved images: ${counts.REAL}`);
console.log(`Brand official candidates: ${counts.CANDIDATE}`);
console.log(`Editorial fallback: ${counts.EDITORIAL}`);
console.log(`Missing visual: ${counts.ERROR}`);
console.log('');

for (const row of rows)
  console.log(`[${row.bucket}] ${row.label} — ${row.detail}`);

if (counts.ERROR > 0) {
  console.error(
    `\n${String(counts.ERROR)} producto(s) activo(s) sin ninguna solución visual (ni imagen real ni fallback editorial).`,
  );
  process.exit(1);
}
