import { productMediaSchema, type ProductMedia } from '@/domain/productMedia';

/**
 * Un producto puede tener varias entradas (p. ej. una candidata de marca y,
 * más adelante, un asset propio ya descargado); el resolver
 * (`src/application/productMediaResolver.ts`) elige la de mejor prioridad
 * entre las que estén `approved`. Las `candidate`/`rejected` quedan aquí
 * como memoria de investigación — ver `docs/PRODUCT_MEDIA_AUDIT.md` para el
 * razonamiento completo de cada una.
 *
 * IMPORTANTE: ninguna entrada de este archivo se marca `approved` sin que un
 * humano haya confirmado la licencia de reutilización (`rightsStatus:
 * 'permission_granted'`) y haya descargado el asset a `public/products/`
 * (`delivery: 'local'`, con `localPath`). Ver la nota de `productMediaSchema`
 * sobre `delivery` (local vs remote) y `rightsStatus`.
 *
 * Las 7 entradas de abajo son todas `delivery: 'local'`: si algún día se
 * confirma el permiso, el siguiente paso es descargar el asset (nunca
 * hotlinkear) y marcarla `approved`. Ninguna es todavía `remote`: eso queda
 * reservado a Amazon Creators API (ver Fase 5 en `productMediaResolver.ts`),
 * que hoy sigue desactivada.
 */
const RAW_PRODUCT_MEDIA: Record<string, ProductMedia[]> = {
  'beurer-mp62-set-manicura-pedicura': [
    {
      productId: 'beurer-mp62-set-manicura-pedicura',
      delivery: 'local',
      sourceType: 'brand_official',
      sourcePage: 'https://www.beurer.com/global/p/57035/',
      imageUrl:
        'https://res.cloudinary.com/beurer/image/upload/mp62-web-main-image-de-v01-beurer.jpg',
      exactProductMatch: true,
      usageBasis: 'manufacturer_authorized',
      alt: 'Beurer MP 62, set de manicura y pedicura',
      lastVerifiedAt: '2026-08-24',
      status: 'candidate',
      rightsStatus: 'needs_permission',
      note: 'Web oficial de Beurer, modelo 570.35 confirmado como el MP 62. La página de prensa de Beurer no da permiso explícito de reuso; pide material a presse@beurer.de antes de aprobar.',
    },
  ],
  'ohora-n-cream-cotton': [
    {
      productId: 'ohora-n-cream-cotton',
      delivery: 'local',
      sourceType: 'brand_official',
      sourcePage: 'https://ohora.com/products/nb-076',
      exactProductMatch: true,
      usageBasis: 'manufacturer_authorized',
      alt: 'ohora N Cream Cotton, tiras de gel semicurado',
      lastVerifiedAt: '2026-08-24',
      status: 'candidate',
      rightsStatus: 'needs_permission',
      note: 'Ficha oficial en ohora.com (título "N Cream Cotton" exacto), imágenes en su propio CDN de Shopify. Sin lenguaje explícito de reuso; ohora tiene programa de afiliados (candidato a vía formal) pero no confirmado.',
    },
  ],
  'nailog-maze': [
    {
      productId: 'nailog-maze',
      delivery: 'local',
      sourceType: 'brand_official',
      sourcePage: 'https://www.nailog.com/products/maze',
      exactProductMatch: true,
      usageBasis: 'manufacturer_authorized',
      alt: 'NAILOG Maze, tiras de gel semicurado con diseño floral',
      lastVerifiedAt: '2026-08-24',
      status: 'candidate',
      rightsStatus: 'needs_permission',
      note: 'Ficha oficial en nailog.com ("MAZE | Mani Strip 34PC"), imágenes propias. Sin press kit visible; requiere contacto directo con la marca.',
    },
  ],
  'nailog-meadow': [
    {
      productId: 'nailog-meadow',
      delivery: 'local',
      sourceType: 'brand_official',
      sourcePage:
        'https://www.nailog.com/products/in-the-meadow-mani-strip-34pc',
      exactProductMatch: true,
      usageBasis: 'manufacturer_authorized',
      alt: 'NAILOG In the Meadow, tiras de gel semicurado con diseño floral',
      lastVerifiedAt: '2026-08-24',
      status: 'candidate',
      rightsStatus: 'needs_permission',
      note: 'Ficha oficial en nailog.com ("IN THE MEADOW | Mani Strip 34PC"), imágenes propias. Sin press kit visible; requiere contacto directo con la marca.',
    },
  ],
  'mylee-diva-sin-lampara': [
    {
      productId: 'mylee-diva-sin-lampara',
      delivery: 'local',
      sourceType: 'brand_official',
      sourcePage: 'https://mylee.co.uk/products/mylee-diva-gel-nail-wraps',
      exactProductMatch: true,
      usageBasis: 'manufacturer_authorized',
      alt: 'Mylee Diva, gel nail wraps precuradas',
      lastVerifiedAt: '2026-08-24',
      status: 'candidate',
      rightsStatus: 'needs_permission',
      note: 'Ficha oficial en mylee.co.uk ("Mylee Gel Nail Wraps - Diva"), imágenes propias. Marca real del Reino Unido, sin press kit público localizado.',
    },
  ],
  'melodysusie-colector-polvo-profesional': [
    {
      productId: 'melodysusie-colector-polvo-profesional',
      delivery: 'local',
      sourceType: 'brand_official',
      sourcePage:
        'https://www.melodysusie.com/products/professional-spro-nail-dust-collector',
      exactProductMatch: true,
      usageBasis: 'manufacturer_authorized',
      alt: 'MelodySusie SPro, aspirador de polvo de uñas con filtro reutilizable',
      lastVerifiedAt: '2026-08-24',
      status: 'candidate',
      rightsStatus: 'needs_permission',
      note: 'Ficha oficial en melodysusie.com (línea "SPro", 4000RPM, 2 modos de succión, filtro reutilizable — coincide con el ASIN). Marca real con programa de afiliados; contactar affiliate@melodysusie.com o melodysusiepr@gmail.com para permiso explícito.',
    },
  ],
  'retoo-aspirador-unas-60w-3-ventiladores': [
    {
      productId: 'retoo-aspirador-unas-60w-3-ventiladores',
      delivery: 'local',
      sourceType: 'brand_official',
      sourcePage:
        'https://retoo.eu/519-m009a-aleja1-z020a-profesjonalny-mocny-pochlaniacz-pylu-z-3-wiatrakami-i-workami-u022.html',
      exactProductMatch: false,
      usageBasis: 'manufacturer_authorized',
      alt: 'Retoo, aspirador de polvo de uñas con 3 ventiladores',
      lastVerifiedAt: '2026-08-24',
      status: 'candidate',
      rightsStatus: 'needs_permission',
      note: 'CONFIANZA BAJA: retoo.eu es la tienda propia de Retoo, pero el sitio se describe como importador/mayorista multi-categoría, no fabricante confirmado. Un listado de Amazon Polonia para este ASIN indica 40W frente a los 60W de la ficha ES investigada — inconsistencia sin resolver. Verificar coincidencia exacta de SKU y potencia antes de avanzar.',
    },
  ],
};

export const PRODUCT_MEDIA: Record<string, ProductMedia[]> = Object.fromEntries(
  Object.entries(RAW_PRODUCT_MEDIA).map(([productId, entries]) => [
    productId,
    entries.map((entry) => productMediaSchema.parse(entry)),
  ]),
);

export function getMediaEntries(productId: string): ProductMedia[] {
  return PRODUCT_MEDIA[productId] ?? [];
}
