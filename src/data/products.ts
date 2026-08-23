import rawCatalog from '../../tus-unas-amazon-es-products.seed.json';
import tornosCatalog from '../../tus-unas-amazon-es-tornos.seed.json';
import dustCollectorCatalog from '../../tus-unas-amazon-es-aspiradores-polvo.seed.json';
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
  B09M5D3NWF: {
    id: 'ohora-n-cream-cotton',
    category: 'unas-semicuradas',
    summary:
      'Tiras de gel semicurado de acabado nude rosado. El paquete verificado contiene 30 tiras y requiere lámpara UV/LED.',
    considerations: [
      'La lámpara es necesaria y no figura incluida en el paquete investigado.',
    ],
  },
  B0BKKNNV7K: {
    id: 'nailog-maze',
    category: 'unas-semicuradas',
    summary:
      'Diseño floral de gel semicurado con 34 tiras en varios tamaños. Necesita curado con lámpara UV/LED.',
    considerations: ['La lámpara necesaria para el curado no figura incluida.'],
  },
  B0FDGB393Z: {
    id: 'nailog-meadow',
    category: 'unas-semicuradas',
    summary:
      'Diseño floral Meadow en formato de gel semicurado. El paquete investigado indica 34 tiras y uso de lámpara.',
    considerations: ['La lámpara necesaria para el curado no figura incluida.'],
  },
  B0D9VCWYT8: {
    id: 'jmeowio-francesa-rosa',
    category: 'unas-semicuradas',
    summary:
      'Manicura francesa rosa en tiras de gel semicurado. El paquete verificado contiene 20 tiras y requiere lámpara.',
    considerations: ['Necesita una lámpara UV/LED que no figura incluida.'],
    useCases: ['manicura-francesa', 'acabado-natural'],
  },
  B0DD7BHL4F: {
    id: 'jmeowio-estampado-leopardo',
    category: 'unas-semicuradas',
    summary:
      'Tiras de gel semicurado con estampado de leopardo y enfoque visual llamativo. Requieren lámpara UV/LED.',
    considerations: [
      'La cantidad de tiras no estaba confirmada en la investigación inicial.',
      'La lámpara no figura incluida.',
    ],
  },
  B0D9DB9476: {
    id: 'wahrshei-degradado-rosa',
    category: 'unas-semicuradas',
    summary:
      'Tiras de gel semicurado con degradado rosa. El paquete investigado contiene 20 tiras y necesita lámpara.',
    considerations: ['La lámpara necesaria para el curado no figura incluida.'],
  },
  B0D76V61RX: {
    id: 'wahrshei-francesa-clasica',
    category: 'unas-semicuradas',
    summary:
      'Diseño de francesa clásica en gel semicurado. El paquete verificado contiene 20 tiras y requiere lámpara.',
    considerations: ['La lámpara necesaria para el curado no figura incluida.'],
    useCases: ['manicura-francesa', 'acabado-natural'],
  },
  B0F6D7MVCV: {
    id: 'butbu-kit-semicurado-lampara',
    category: 'unas-semicuradas',
    summary:
      'Kit de inicio con 20 tiras de gel semicurado y lámpara incluida, según la ficha investigada en Amazon.es.',
    considerations: [
      'Conviene comprobar las instrucciones y el contenido exacto del kit en la tienda antes de usarlo.',
    ],
    useCases: ['primer-kit', 'kit-con-lampara'],
    beginnerFriendly: true,
  },
  B0DRHTGYHM: {
    id: 'aokitec-kit-semicurado-lampara',
    category: 'unas-semicuradas',
    summary:
      'Kit de gel semicurado con lámpara incluida y 32 tiras en varios tamaños, según la ficha investigada.',
    considerations: [
      'Conviene comprobar las instrucciones y el contenido exacto del kit en la tienda antes de usarlo.',
    ],
    useCases: ['primer-kit', 'kit-con-lampara'],
    beginnerFriendly: true,
  },
  B0F4DXQDJQ: {
    id: 'mylee-diva-sin-lampara',
    category: 'gel-nail-wraps',
    summary:
      'Tiras de gel precured listas para aplicar sin lámpara. El paquete investigado contiene 20 tiras.',
    considerations: [
      'Es un formato precured sin lámpara, distinto del gel semicurado UV convencional.',
    ],
    useCases: ['manicura-sin-lampara'],
  },
};

const SEMICURADAS_PRODUCTS: Product[] = rawCatalog.products.map((raw) => {
  const editorial = EDITORIAL[raw.asin];
  if (!editorial)
    throw new Error(`Falta información editorial para ${raw.asin}`);
  return productSchema.parse({
    id: editorial.id,
    slug: editorial.id,
    brand: raw.brand,
    name: raw.name,
    asin: raw.asin,
    category: editorial.category,
    productType: raw.productType,
    requiresLamp: raw.requiresLamp,
    includesLamp: raw.includesLamp,
    ...(raw.stripCount === null ? {} : { stripCount: raw.stripCount }),
    styleTags: raw.styleTags,
    useCases: editorial.useCases ?? [],
    editorialAngles: raw.editorialAngles,
    ...(editorial.beginnerFriendly === undefined
      ? {}
      : { beginnerFriendly: editorial.beginnerFriendly }),
    summary: editorial.summary,
    considerations: editorial.considerations,
    amazonMarketplace: 'es',
    affiliateEligible: true,
    editorialStatus: 'approved',
    researchStatus: 'verified-amazon-es',
    sourceVerifiedAt: rawCatalog.verifiedAt,
    active: true,
    sample: false,
  });
});

interface ToolEditorialData {
  summary: string;
  considerations: string[];
}

const TORNO_EDITORIAL: Record<string, ToolEditorialData> = {
  'kredioo-torno-profesional-35000-rpm': {
    summary:
      'Torno profesional Kredioo de 35000 RPM con 11 fresas intercambiables, pantalla LED y giro bidireccional, pensado para gel, acrílico, manicura y pedicura.',
    considerations: [
      'Los datos de RPM y accesorios proceden de la ficha investigada en Amazon.es; no hemos probado este torno personalmente.',
    ],
  },
  'nailgirls-torno-35000-rpm-pedal': {
    summary:
      'Torno profesional NAILGIRLS de 35000 RPM con 11 accesorios, pantalla LCD y pedal incluido para controlar la velocidad con el pie.',
    considerations: [
      'El pedal y la pantalla figuran en la ficha investigada en Amazon.es; conviene revisar el contenido exacto del kit antes de comprar.',
    ],
  },
  'engerwall-torno-portatil-35000-rpm': {
    summary:
      'Torno ENGERWALL portátil y recargable de 35000 RPM con 6 accesorios y pantalla LCD, pensado para manicura y pedicura sin depender de un cable permanente.',
    considerations: [
      'La ficha investigada no confirma si se alimenta también por USB; verifícalo en Amazon.es antes de comprar.',
    ],
  },
  'beurer-mp62-set-manicura-pedicura': {
    summary:
      'Set de manicura y pedicura Beurer MP 62 con 10 accesorios y luz LED integrada, de una marca de electrónica de consumo conocida en España.',
    considerations: [
      'Su velocidad máxima (5400 RPM) es notablemente inferior a la de los tornos profesionales de esta comparativa; pensado para uso doméstico ocasional.',
    ],
  },
  'xoali-torno-25000-rpm-12-en-1': {
    summary:
      'Torno Xoali de 25000 RPM con 12 accesorios, alimentación USB y una broca de cerámica incluida, orientado a manicura en casa y gel.',
    considerations: [
      'Los datos proceden de la ficha investigada en Amazon.es; no hemos probado este torno personalmente.',
    ],
  },
  'bickon-torno-20000-rpm-6-en-1': {
    summary:
      'Torno BICKON de entrada, 20000 RPM con 6 accesorios y alimentación USB, pensado para quien empieza con manicura en casa.',
    considerations: [
      'Tiene menos accesorios y RPM que los modelos profesionales de esta comparativa; adecuado como primera toma de contacto.',
    ],
  },
  'weiyi-torno-usb-20000-rpm': {
    summary:
      'Torno WEIYI de 20000 RPM con 11 puntas incluidas y alimentación USB, en un formato compacto para manicura y pedicura portátil.',
    considerations: [
      'Los datos proceden de la ficha investigada en Amazon.es; no hemos probado este torno personalmente.',
    ],
  },
  'ponoseu-torno-profesional-portatil': {
    summary:
      'Torno Ponoseu portátil y recargable pensado para manicura y pedicura sin cable, como alternativa cuando priorizas la portabilidad.',
    considerations: [
      'La ficha investigada no confirma la velocidad máxima ni el número de accesorios; consulta los datos actualizados en Amazon.es antes de comprar.',
    ],
  },
};

const DUST_COLLECTOR_EDITORIAL: Record<string, ToolEditorialData> = {
  'retoo-aspirador-unas-60w-3-ventiladores': {
    summary:
      'Aspirador de polvo Retoo de 60W con 3 ventiladores, una opción de entrada para manicura y pedicura de sobremesa en casa.',
    considerations: [
      'La ficha investigada no confirma si el filtro es reutilizable ni si el aparato es recargable.',
    ],
  },
  'melodysusie-colector-polvo-profesional': {
    summary:
      'Colector de polvo MelodySusie, de una marca especializada en equipamiento de manicura, con filtro reutilizable y 2 modos de aspiración.',
    considerations: [
      'La ficha investigada no confirma la potencia en vatios; consulta el dato actualizado en Amazon.es.',
    ],
  },
  'layhou-aspirador-unas-80w': {
    summary:
      'Aspirador de uñas Layhou de 80W con 2 niveles de velocidad y filtro reutilizable, pensado para manicura en casa, salón y uñas acrílicas.',
    considerations: [
      'Los datos proceden de la ficha investigada en Amazon.es; no hemos probado este aspirador personalmente.',
    ],
  },
  'adonafy-extractor-polvo-unas-120w': {
    summary:
      'Extractor de polvo Adonafy de 120W con filtro reutilizable, orientado a uso intensivo en salón y manicura en casa.',
    considerations: [
      'La ficha investigada no confirma el número de niveles de velocidad ni de ventiladores.',
    ],
  },
  'anbeistee-colector-polvo-2000pa': {
    summary:
      'Colector de polvo ANBEISTEE con 2000 Pa de succión y 45 filtros desechables incluidos, pensado para uñas acrílicas y manicura de sobremesa.',
    considerations: [
      'Usa filtros desechables en vez de un filtro reutilizable; conviene revisar el coste de reposición antes de comprar.',
    ],
  },
  'cris-nails-aspirador-polvo-manicura': {
    summary:
      'Aspirador de polvo CRIS NAILS, una opción sencilla para manicura y pedicura de sobremesa.',
    considerations: [
      'La ficha investigada no confirma potencia, niveles de velocidad ni tipo de filtro; consulta los datos actualizados en Amazon.es.',
    ],
  },
  'freeup-aspirador-polvo-filtro-luz-led': {
    summary:
      'Aspirador de polvo FREEUP con filtro reutilizable, lámpara LED integrada y motor sin escobillas, pensado para manicura de precisión en salón.',
    considerations: [
      'La ficha investigada no confirma la potencia en vatios ni el número de niveles de velocidad.',
    ],
  },
  'jodsone-colector-polvo-120w-3-niveles': {
    summary:
      'Colector de polvo JODSONE de 120W con 3 niveles de velocidad y filtro reutilizable, pensado para salón y manicura en casa.',
    considerations: [
      'Los datos proceden de la ficha investigada en Amazon.es; no hemos probado este aspirador personalmente.',
    ],
  },
};

const TORNO_PRODUCTS: Product[] = tornosCatalog.products.map((raw) => {
  const editorial = TORNO_EDITORIAL[raw.id];
  if (!editorial) throw new Error(`Falta información editorial para ${raw.id}`);
  return productSchema.parse({
    id: raw.id,
    slug: raw.id,
    brand: raw.brand,
    name: raw.name,
    asin: raw.asin,
    category: tornosCatalog.category,
    productType: 'nail_drill',
    technicalSpecs: { kind: 'nail_drill', ...raw.technicalSpecs },
    styleTags: [],
    useCases: raw.useCases,
    editorialAngles: raw.editorialAngles,
    summary: editorial.summary,
    considerations: editorial.considerations,
    amazonMarketplace: 'es',
    affiliateEligible: true,
    editorialStatus: 'approved',
    researchStatus: 'verified-amazon-es',
    sourceVerifiedAt: tornosCatalog.verifiedAt,
    active: true,
    sample: false,
  });
});

const DUST_COLLECTOR_PRODUCTS: Product[] = dustCollectorCatalog.products.map(
  (raw) => {
    const editorial = DUST_COLLECTOR_EDITORIAL[raw.id];
    if (!editorial)
      throw new Error(`Falta información editorial para ${raw.id}`);
    return productSchema.parse({
      id: raw.id,
      slug: raw.id,
      brand: raw.brand,
      name: raw.name,
      asin: raw.asin,
      category: dustCollectorCatalog.category,
      productType: 'nail_dust_collector',
      technicalSpecs: { kind: 'nail_dust_collector', ...raw.technicalSpecs },
      styleTags: [],
      useCases: raw.useCases,
      editorialAngles: raw.editorialAngles,
      summary: editorial.summary,
      considerations: editorial.considerations,
      amazonMarketplace: 'es',
      affiliateEligible: true,
      editorialStatus: 'approved',
      researchStatus: 'verified-amazon-es',
      sourceVerifiedAt: dustCollectorCatalog.verifiedAt,
      active: true,
      sample: false,
    });
  },
);

export const PRODUCTS: Product[] = [
  ...SEMICURADAS_PRODUCTS,
  ...TORNO_PRODUCTS,
  ...DUST_COLLECTOR_PRODUCTS,
];

export const FEATURED_PRODUCTS = PRODUCTS.filter((product) =>
  [
    'jmeowio-francesa-rosa',
    'nailog-maze',
    'butbu-kit-semicurado-lampara',
    'mylee-diva-sin-lampara',
  ].includes(product.id),
);
export const PUBLISHED_BRANDS = ['jmeowio', 'nailog', 'wahrshei'] as const;
export const slugifyBrand = (brand: string): string =>
  brand
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export const getProductBySlug = (slug: string): Product | undefined =>
  PRODUCTS.find(
    (product) =>
      product.slug === slug &&
      product.active &&
      product.editorialStatus === 'approved',
  );

export function getRelatedProducts(product: Product, limit = 3): Product[] {
  return PRODUCTS.filter(
    (candidate) => candidate.id !== product.id && candidate.active,
  )
    .map((candidate) => ({
      candidate,
      score:
        (candidate.category === product.category ? 4 : 0) +
        (candidate.brand === product.brand ? 3 : 0) +
        candidate.styleTags.filter((tag) => product.styleTags.includes(tag))
          .length,
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.candidate.name.localeCompare(b.candidate.name, 'es'),
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
