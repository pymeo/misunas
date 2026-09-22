import {
  AMAZON_IMAGE_HOSTS,
  CREATORS_API_MARKETPLACE_HOSTS,
} from '@/config/amazonCreators';
import type { CreatorsApiItem } from '@/domain/amazonCreators';
import type { AmazonMediaSnapshotEntry } from '@/domain/amazonMediaSnapshot';
import type { Product } from '@/domain/product';
import { productMediaSchema } from '@/domain/productMedia';

/**
 * Traduce un item de Amazon Creators API al dominio de Tus-Uñas.
 *
 * Es la única frontera donde datos de Amazon se convierten en datos nuestros,
 * y por eso concentra todas las comprobaciones de integridad. Ninguna es
 * decorativa:
 *
 *  - **ASIN**: Amazon puede devolver los items en otro orden, así que el
 *    emparejamiento es por ASIN, nunca por posición. Si el ASIN devuelto no
 *    es el pedido, se rechaza: no se acepta en silencio la fotografía de otro
 *    producto.
 *  - **Host de imagen**: solo hosts de la allowlist, que es exactamente la
 *    misma que la de `img-src` en `public/_headers`. Así una URL de un host
 *    nuevo se reporta en el sync en vez de renderizarse y morir en la CSP.
 *  - **detailPageURL**: debe ser del marketplace español y contener el ASIN.
 *    Si Amazon devolviera una URL de otro mercado o de otro producto, se
 *    descarta y el enlace comercial cae al constructor por ASIN de siempre.
 *  - **Atributos ausentes**: se omiten. Nunca se inventa `width`, `height`,
 *    título ni marca.
 */

export type MappingRejection =
  | { reason: 'asin-mismatch'; detail: string }
  | { reason: 'no-image'; detail: string }
  | { reason: 'image-host-not-allowed'; detail: string }
  | { reason: 'invalid-media'; detail: string };

export type MappingResult =
  | { ok: true; entry: AmazonMediaSnapshotEntry; warnings: string[] }
  | { ok: false; rejection: MappingRejection };

/** El esquema de dominio limita `alt` a 200 caracteres. */
const MAX_ALT_LENGTH = 200;
const MAX_VARIANTS = 6;

function truncateAlt(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= MAX_ALT_LENGTH) return collapsed;
  const cut = collapsed.slice(0, MAX_ALT_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > MAX_ALT_LENGTH / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function isAllowedImageHost(url: string): boolean {
  try {
    return (AMAZON_IMAGE_HOSTS as readonly string[]).includes(
      new URL(url).hostname,
    );
  } catch {
    return false;
  }
}

/**
 * Valida que la URL oficial corresponde a este ASIN y al marketplace
 * español. Devuelve `null` (y el llamante hace fallback) en cuanto algo no
 * encaja.
 */
export function validateDetailPageUrl(
  rawUrl: string | undefined,
  asin: string,
  marketplaceHost: string,
): string | null {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.hostname !== marketplaceHost) return null;
  if (!url.pathname.toUpperCase().includes(asin.toUpperCase())) return null;
  return url.toString();
}

export interface MapItemOptions {
  product: Product;
  item: CreatorsApiItem;
  /** Momento de la respuesta de Amazon, en ISO. */
  fetchedAt: string;
}

export function mapCreatorsApiItem(options: MapItemOptions): MappingResult {
  const { product, item, fetchedAt } = options;
  const expectedAsin = product.asin;
  const warnings: string[] = [];

  if (!expectedAsin)
    return {
      ok: false,
      rejection: {
        reason: 'asin-mismatch',
        detail: 'El producto no tiene ASIN en el catálogo.',
      },
    };

  if (item.asin.toUpperCase() !== expectedAsin.toUpperCase())
    return {
      ok: false,
      rejection: {
        reason: 'asin-mismatch',
        detail: `Amazon devolvió el ASIN ${item.asin} para una petición de ${expectedAsin}.`,
      },
    };

  const primary = item.images?.primary?.large;
  if (!primary)
    return {
      ok: false,
      rejection: {
        reason: 'no-image',
        detail: `Amazon no devolvió images.primary.large para ${expectedAsin}.`,
      },
    };

  if (!isAllowedImageHost(primary.url))
    return {
      ok: false,
      rejection: {
        reason: 'image-host-not-allowed',
        detail: `La imagen de ${expectedAsin} viene de un host no autorizado en la CSP: ${new URL(primary.url).hostname}. Añádelo a AMAZON_IMAGE_HOSTS y a img-src si Amazon lo sirve oficialmente.`,
      },
    };

  const marketplaceHost =
    CREATORS_API_MARKETPLACE_HOSTS[product.amazonMarketplace];
  const detailPageURL = validateDetailPageUrl(
    item.detailPageURL,
    expectedAsin,
    marketplaceHost,
  );
  if (item.detailPageURL && !detailPageURL)
    warnings.push(
      `detailPageURL descartada para ${expectedAsin}: no es una URL https de ${marketplaceHost} que contenga el ASIN. Se usará el enlace construido desde el ASIN.`,
    );

  const amazonTitle = item.itemInfo?.title?.displayValue;
  const alt = truncateAlt(amazonTitle ?? `${product.brand} ${product.name}`);

  const variants = (item.images?.variants ?? [])
    .map((variant) => variant.large)
    .filter((image): image is NonNullable<typeof image> => image !== undefined)
    .filter((image) => image.url !== primary.url)
    .filter((image) => {
      if (isAllowedImageHost(image.url)) return true;
      warnings.push(
        `Variante descartada para ${expectedAsin}: host no autorizado.`,
      );
      return false;
    })
    .slice(0, MAX_VARIANTS)
    .map((image) => ({
      url: image.url,
      width: image.width,
      height: image.height,
    }));

  const parsedMedia = productMediaSchema.safeParse({
    productId: product.id,
    delivery: 'remote',
    sourceType: 'amazon_official',
    imageUrl: primary.url,
    ...(detailPageURL ? { sourcePage: detailPageURL } : {}),
    exactProductMatch: true,
    usageBasis: 'amazon_affiliate_asset',
    alt,
    width: primary.width,
    height: primary.height,
    lastVerifiedAt: fetchedAt.slice(0, 10),
    status: 'approved',
    rightsStatus: 'permission_granted',
    rightsEvidence: `Respuesta oficial de Amazon Creators API (GetItems, partnerTag propio) del ${fetchedAt.slice(0, 10)}`,
    approvedAt: fetchedAt.slice(0, 10),
    approvedBy: 'automatización Creators API',
    note: 'Imagen servida desde la URL oficial de Amazon; nunca se descarga ni se autoaloja.',
  });

  if (!parsedMedia.success)
    return {
      ok: false,
      rejection: {
        reason: 'invalid-media',
        detail: `La entrada de media generada para ${expectedAsin} no valida: ${parsedMedia.error.issues[0]?.message ?? 'error de esquema'}.`,
      },
    };

  return {
    ok: true,
    warnings,
    entry: {
      asin: expectedAsin,
      productId: product.id,
      fetchedAt,
      media: parsedMedia.data,
      variants,
      ...(detailPageURL ? { detailPageURL } : {}),
      ...(amazonTitle ? { title: amazonTitle } : {}),
      ...(item.itemInfo?.byLineInfo?.brand?.displayValue
        ? { brand: item.itemInfo.byLineInfo.brand.displayValue }
        : {}),
      features: (item.itemInfo?.features?.displayValues ?? []).slice(0, 10),
    },
  };
}
