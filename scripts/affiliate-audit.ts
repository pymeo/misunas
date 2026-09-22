import { buildAmazonAffiliateUrl } from '../src/application/affiliate';
import { resolveAmazonProductUrl } from '../src/application/amazonProductUrl';
import { AMAZON_CONFIG } from '../src/config/site';
import { AMAZON_MEDIA_SNAPSHOT } from '../src/data/amazonMediaSnapshot';
import { PRODUCTS } from '../src/data/products';

const MARKETPLACE_HOSTS: Record<string, string> = { es: 'www.amazon.es' };

interface Issue {
  productId: string;
  reason: string;
}

const activeProducts = PRODUCTS.filter(
  (product) => product.active && product.editorialStatus === 'approved',
);

const issues: Issue[] = [];
let eligibleCount = 0;
let validLinkCount = 0;
let invalidAsinCount = 0;
let wrongMarketplaceCount = 0;
let missingTagCount = 0;

for (const product of activeProducts) {
  if (!product.affiliateEligible) continue;
  eligibleCount++;

  const href = buildAmazonAffiliateUrl(product);
  if (!href) {
    invalidAsinCount++;
    issues.push({
      productId: product.id,
      reason: 'no se pudo construir un enlace (sin ASIN ni amazonUrl válidos)',
    });
    continue;
  }

  if (/localhost|127\.0\.0\.1/.test(href)) {
    issues.push({
      productId: product.id,
      reason: `enlace apunta a localhost: ${href}`,
    });
    continue;
  }

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    invalidAsinCount++;
    issues.push({
      productId: product.id,
      reason: `URL resultante inválida: ${href}`,
    });
    continue;
  }

  if (url.protocol !== 'https:') {
    issues.push({
      productId: product.id,
      reason: `protocolo inesperado: ${url.protocol}`,
    });
    continue;
  }

  const expectedHost = MARKETPLACE_HOSTS[product.amazonMarketplace];
  if (url.hostname !== expectedHost) {
    wrongMarketplaceCount++;
    issues.push({
      productId: product.id,
      reason: `host inesperado: ${url.hostname} (se esperaba ${expectedHost ?? '?'})`,
    });
    continue;
  }

  if (product.asin && !/^[A-Z0-9]{10}$/.test(product.asin)) {
    invalidAsinCount++;
    issues.push({
      productId: product.id,
      reason: `ASIN con formato inválido: ${product.asin}`,
    });
    continue;
  }

  if (url.searchParams.get('tag') !== AMAZON_CONFIG.affiliateTag) {
    missingTagCount++;
    issues.push({
      productId: product.id,
      reason: `falta el tag de afiliado (${AMAZON_CONFIG.affiliateTag}) o es incorrecto`,
    });
    continue;
  }

  const extraParams = [...url.searchParams.keys()].filter(
    (key) => key !== 'tag',
  );
  if (extraParams.length > 0) {
    issues.push({
      productId: product.id,
      reason: `parámetros innecesarios en el enlace: ${extraParams.join(', ')}`,
    });
    continue;
  }

  validLinkCount++;
}

console.log('AMAZON AFFILIATE AUDIT');
console.log('');
console.log(`Products checked: ${activeProducts.length}`);
console.log(`Affiliate eligible: ${eligibleCount}`);
console.log(`Valid links: ${validLinkCount}`);
console.log(`Invalid ASIN: ${invalidAsinCount}`);
console.log(`Wrong marketplace: ${wrongMarketplaceCount}`);
console.log(`Missing tag: ${missingTagCount}`);
console.log('');

/**
 * Segunda pasada: el enlace REALMENTE renderizado por `AmazonCTA`, que
 * prefiere la `detailPageURL` oficial de Creators API cuando existe.
 *
 * Se audita por separado, y no sustituyendo la pasada anterior, porque las
 * expectativas son distintas: la URL construida desde el ASIN debe estar
 * limpia de parámetros, mientras que la oficial de Amazon puede traer los
 * suyos (`linkCode`, `ref`…) y eso es correcto. Lo que se exige aquí es lo
 * que de verdad importa: host español, el ASIN correcto y nuestro tag.
 */
const officialIssues: Issue[] = [];
let officialLinkCount = 0;
let asinFallbackCount = 0;

for (const product of activeProducts) {
  if (!product.affiliateEligible) continue;
  const rendered = resolveAmazonProductUrl(product);
  const fallback = buildAmazonAffiliateUrl(product);
  if (!rendered) continue;
  if (rendered === fallback) {
    asinFallbackCount++;
    continue;
  }
  officialLinkCount++;

  const url = new URL(rendered);
  const expectedHost = MARKETPLACE_HOSTS[product.amazonMarketplace];
  if (url.hostname !== expectedHost)
    officialIssues.push({
      productId: product.id,
      reason: `detailPageURL oficial con host inesperado: ${url.hostname}`,
    });
  else if (
    product.asin &&
    !url.pathname.toUpperCase().includes(product.asin.toUpperCase())
  )
    officialIssues.push({
      productId: product.id,
      reason: `detailPageURL oficial no contiene el ASIN ${product.asin}: ${url.pathname}`,
    });
  else if (url.searchParams.get('tag') !== AMAZON_CONFIG.affiliateTag)
    officialIssues.push({
      productId: product.id,
      reason: `detailPageURL oficial sin nuestro tag (${AMAZON_CONFIG.affiliateTag})`,
    });
}

console.log('AMAZON CREATORS API — ENLACES OFICIALES');
console.log('');
console.log(
  `Snapshot de Amazon: ${
    AMAZON_MEDIA_SNAPSHOT.snapshot?.amazonQueried
      ? `${String(AMAZON_MEDIA_SNAPSHOT.byAsin.size)} entrada(s) fresca(s)`
      : 'vacío (integración desactivada o sin credenciales)'
  }`,
);
console.log(`Enlaces desde detailPageURL oficial: ${officialLinkCount}`);
console.log(`Enlaces construidos desde el ASIN: ${asinFallbackCount}`);
console.log('');

const allIssues = [...issues, ...officialIssues];
if (allIssues.length > 0) {
  console.error('Issues:');
  for (const issue of allIssues)
    console.error(`  [${issue.productId}] ${issue.reason}`);
  console.log('');
  console.error('FAIL');
  process.exit(1);
}

console.log('PASS');
