import {
  getMediaSrc,
  getProductMedia,
} from '../src/application/productMediaResolver';
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

console.log('PRODUCT MEDIA AUDIT');
console.log('');
console.log(`Total products: ${activeProducts.length}`);
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
