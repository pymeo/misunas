import rawCatalog from '../../tus-unas-amazon-es-products.seed.json';
import { productSchema, type Product } from '@/domain/product';

interface EditorialProductData {
  id: string;
  category: Product['category'];
  summary: string;
  considerations: string[];
  useCases?: string[];
  beginnerFriendly?: boolean;
}

const EDITORIAL: Record<string, EditorialProductData> = {
  B09M5D3NWF: { id: 'ohora-n-cream-cotton', category: 'unas-semicuradas', summary: 'Tiras de gel semicurado de acabado nude rosado. El paquete verificado contiene 30 tiras y requiere lámpara UV/LED.', considerations: ['La lámpara es necesaria y no figura incluida en el paquete investigado.'] },
  B0BKKNNV7K: { id: 'nailog-maze', category: 'unas-semicuradas', summary: 'Diseño floral de gel semicurado con 34 tiras en varios tamaños. Necesita curado con lámpara UV/LED.', considerations: ['La lámpara necesaria para el curado no figura incluida.'] },
  B0FDGB393Z: { id: 'nailog-meadow', category: 'unas-semicuradas', summary: 'Diseño floral Meadow en formato de gel semicurado. El paquete investigado indica 34 tiras y uso de lámpara.', considerations: ['La lámpara necesaria para el curado no figura incluida.'] },
  B0D9VCWYT8: { id: 'jmeowio-francesa-rosa', category: 'unas-semicuradas', summary: 'Manicura francesa rosa en tiras de gel semicurado. El paquete verificado contiene 20 tiras y requiere lámpara.', considerations: ['Necesita una lámpara UV/LED que no figura incluida.'], useCases: ['manicura-francesa', 'acabado-natural'] },
  B0DD7BHL4F: { id: 'jmeowio-estampado-leopardo', category: 'unas-semicuradas', summary: 'Tiras de gel semicurado con estampado de leopardo y enfoque visual llamativo. Requieren lámpara UV/LED.', considerations: ['La cantidad de tiras no estaba confirmada en la investigación inicial.', 'La lámpara no figura incluida.'] },
  B0D9DB9476: { id: 'wahrshei-degradado-rosa', category: 'unas-semicuradas', summary: 'Tiras de gel semicurado con degradado rosa. El paquete investigado contiene 20 tiras y necesita lámpara.', considerations: ['La lámpara necesaria para el curado no figura incluida.'] },
  B0D76V61RX: { id: 'wahrshei-francesa-clasica', category: 'unas-semicuradas', summary: 'Diseño de francesa clásica en gel semicurado. El paquete verificado contiene 20 tiras y requiere lámpara.', considerations: ['La lámpara necesaria para el curado no figura incluida.'], useCases: ['manicura-francesa', 'acabado-natural'] },
  B0F6D7MVCV: { id: 'butbu-kit-semicurado-lampara', category: 'unas-semicuradas', summary: 'Kit de inicio con 20 tiras de gel semicurado y lámpara incluida, según la ficha investigada en Amazon.es.', considerations: ['Conviene comprobar las instrucciones y el contenido exacto del kit en la tienda antes de usarlo.'], useCases: ['primer-kit', 'kit-con-lampara'], beginnerFriendly: true },
  B0DRHTGYHM: { id: 'aokitec-kit-semicurado-lampara', category: 'unas-semicuradas', summary: 'Kit de gel semicurado con lámpara incluida y 32 tiras en varios tamaños, según la ficha investigada.', considerations: ['Conviene comprobar las instrucciones y el contenido exacto del kit en la tienda antes de usarlo.'], useCases: ['primer-kit', 'kit-con-lampara'], beginnerFriendly: true },
  B0F4DXQDJQ: { id: 'mylee-diva-sin-lampara', category: 'gel-nail-wraps', summary: 'Tiras de gel precured listas para aplicar sin lámpara. El paquete investigado contiene 20 tiras.', considerations: ['Es un formato precured sin lámpara, distinto del gel semicurado UV convencional.'], useCases: ['manicura-sin-lampara'] },
};

export const PRODUCTS: Product[] = rawCatalog.products.map((raw) => {
  const editorial = EDITORIAL[raw.asin];
  if (!editorial) throw new Error(`Falta información editorial para ${raw.asin}`);
  return productSchema.parse({
    id: editorial.id, slug: editorial.id, brand: raw.brand, name: raw.name, asin: raw.asin,
    category: editorial.category, productType: raw.productType, requiresLamp: raw.requiresLamp,
    includesLamp: raw.includesLamp, ...(raw.stripCount === null ? {} : { stripCount: raw.stripCount }),
    styleTags: raw.styleTags, useCases: editorial.useCases ?? [], editorialAngles: raw.editorialAngles,
    ...(editorial.beginnerFriendly === undefined ? {} : { beginnerFriendly: editorial.beginnerFriendly }),
    summary: editorial.summary, considerations: editorial.considerations, amazonMarketplace: 'es',
    affiliateEligible: true, editorialStatus: 'approved', researchStatus: 'verified-amazon-es',
    sourceVerifiedAt: rawCatalog.verifiedAt, active: true, sample: false,
  });
});

export const FEATURED_PRODUCTS = PRODUCTS.filter((product) => ['jmeowio-francesa-rosa', 'nailog-maze', 'butbu-kit-semicurado-lampara', 'mylee-diva-sin-lampara'].includes(product.id));
export const PUBLISHED_BRANDS = ['jmeowio', 'nailog', 'wahrshei'] as const;
export const slugifyBrand = (brand: string): string => brand.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const getProductBySlug = (slug: string): Product | undefined => PRODUCTS.find((product) => product.slug === slug && product.active && product.editorialStatus === 'approved');

export function getRelatedProducts(product: Product, limit = 3): Product[] {
  return PRODUCTS.filter((candidate) => candidate.id !== product.id && candidate.active)
    .map((candidate) => ({ candidate, score: (candidate.category === product.category ? 4 : 0) + (candidate.brand === product.brand ? 3 : 0) + candidate.styleTags.filter((tag) => product.styleTags.includes(tag)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name, 'es'))
    .slice(0, limit).map(({ candidate }) => candidate);
}
