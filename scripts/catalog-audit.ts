import { PRODUCTS } from '../src/data/products';
import type { Product } from '../src/domain/product';

interface Issue {
  productId: string;
  severity: 'error' | 'warning';
  reason: string;
}

const issues: Issue[] = [];
const error = (productId: string, reason: string) =>
  issues.push({ productId, severity: 'error', reason });
const warn = (productId: string, reason: string) =>
  issues.push({ productId, severity: 'warning', reason });

// --- Duplicados: ya imposibles si el catálogo pasa por productSchema, pero
// se comprueban aquí también para que un CI falle rápido y con un mensaje
// legible si algún día se añade un producto fuera de ese flujo. ---
function checkDuplicates(key: 'id' | 'slug' | 'asin') {
  const seen = new Map<string, string[]>();
  for (const product of PRODUCTS) {
    const value = product[key];
    if (value === undefined) continue;
    const list = seen.get(value) ?? [];
    list.push(product.id);
    seen.set(value, list);
  }
  for (const [value, ids] of seen)
    if (ids.length > 1) error(ids.join(', '), `${key} duplicado: "${value}"`);
}
checkDuplicates('id');
checkDuplicates('slug');
checkDuplicates('asin');

// --- Coherencia categoría/productType: solo se comprueban las combinaciones
// que el catálogo usa hoy; una categoría no listada aquí no se valida (no
// hay todavía reglas conocidas para ella). ---
const CATEGORY_PRODUCT_TYPES: Partial<
  Record<Product['category'], Product['productType'][]>
> = {
  tornos: ['nail_drill'],
  'aspiradores-polvo-unas': ['nail_dust_collector'],
  'impresoras-unas': ['nail_printer_3d'],
  'unas-semicuradas': ['semi_cured_uv', 'starter_kit_uv'],
  'gel-nail-wraps': ['pre_cured_no_lamp'],
};
for (const product of PRODUCTS) {
  const allowed = CATEGORY_PRODUCT_TYPES[product.category];
  if (allowed && !allowed.includes(product.productType))
    error(
      product.id,
      `productType "${product.productType}" no coincide con category "${product.category}" (se esperaba ${allowed.join(' o ')})`,
    );
}

// --- Campos base vacíos o solo espacios (el esquema exige longitud mínima, pero no descarta cadenas de solo espacios). ---
for (const product of PRODUCTS) {
  if (!product.brand.trim()) error(product.id, 'brand vacío o solo espacios');
  if (!product.summary.trim())
    error(product.id, 'summary vacío o solo espacios');
}

// --- Producto activo/aprobado sin ninguna vía comercial (ni ASIN ni amazonUrl, o no afiliable). ---
for (const product of PRODUCTS) {
  if (!product.active || product.editorialStatus !== 'approved') continue;
  if (!product.asin && !product.amazonUrl)
    error(
      product.id,
      'activo y aprobado pero sin ASIN ni amazonUrl: no puede generar un CTA',
    );
  else if (!product.affiliateEligible)
    warn(
      product.id,
      'activo y aprobado pero affiliateEligible=false: no mostrará CTA de Amazon',
    );
}

// --- seoIndexable sin contenido editorial suficiente para justificar indexación. ---
for (const product of PRODUCTS) {
  if (!product.seoIndexable) continue;
  if (!product.active || product.editorialStatus !== 'approved')
    error(
      product.id,
      'seoIndexable pero no está active+approved (quedará noindex igualmente, revisar la allowlist)',
    );
  if (product.considerations.length === 0)
    warn(
      product.id,
      'seoIndexable sin ninguna consideración editorial (considerations vacío)',
    );
  if (product.summary.length < 40)
    warn(
      product.id,
      `seoIndexable con summary corto (${product.summary.length} caracteres)`,
    );
  if (!product.sourceVerifiedAt)
    warn(
      product.id,
      'seoIndexable sin sourceVerifiedAt (no hay fecha de verificación que citar)',
    );
}

// --- Fechas inválidas o en el futuro. ---
const today = new Date();
for (const product of PRODUCTS) {
  if (!product.sourceVerifiedAt) continue;
  const parsed = new Date(product.sourceVerifiedAt);
  if (Number.isNaN(parsed.getTime()))
    error(
      product.id,
      `sourceVerifiedAt no es una fecha válida: "${product.sourceVerifiedAt}"`,
    );
  else if (parsed.getTime() > today.getTime())
    error(
      product.id,
      `sourceVerifiedAt está en el futuro: "${product.sourceVerifiedAt}"`,
    );
}

const errors = issues.filter((issue) => issue.severity === 'error');
const warnings = issues.filter((issue) => issue.severity === 'warning');

console.log('CATALOG AUDIT');
console.log('');
console.log(`Products checked: ${PRODUCTS.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log('');

if (warnings.length > 0) {
  console.log('Warnings:');
  for (const issue of warnings)
    console.log(`  [${issue.productId}] ${issue.reason}`);
  console.log('');
}

if (errors.length > 0) {
  console.error('Errors:');
  for (const issue of errors)
    console.error(`  [${issue.productId}] ${issue.reason}`);
  console.log('');
  console.error('FAIL');
  process.exit(1);
}

console.log('PASS');
