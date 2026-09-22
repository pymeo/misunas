import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mapCreatorsApiItem } from '@/application/amazon/creatorsMediaMapper';
import {
  CREATORS_API_GET_ITEMS_URL,
  CREATORS_API_TOKEN_ENDPOINTS,
} from '@/config/amazonCreators';
import { PRODUCTS } from '@/data/products';
import { amazonMediaSnapshotSchema } from '@/domain/amazonMediaSnapshot';
import { createCreatorsApiClient } from '@/infrastructure/amazon/creatorsApiClient';
import { readCreatorsApiCredentials } from '@/infrastructure/amazon/credentials';
import { createCreatorsApiTokenProvider } from '@/infrastructure/amazon/tokenProvider';

/**
 * Contrato sobre HTTP real. Levanta un servidor local que imita a Login with
 * Amazon y a Creators API y hace pasar por él la cadena completa
 * (credenciales → token → GetItems → mapeo → snapshot), por sockets de
 * verdad, no con `fetch` mockeado.
 *
 * Sirve para lo que un mock no cubre: serialización real del cuerpo,
 * cabeceras tal como salen, códigos de estado, `Retry-After`, y que el
 * snapshot resultante valide contra el esquema que consume el build.
 *
 * El servidor reproduce a propósito los cuatro casos que se dan en
 * producción: un 429 inicial, items correctos, un ASIN sin imagen y un ASIN
 * rechazado por Amazon (error parcial).
 */

let server: Server;
let baseUrl = '';
let tokenRequests = 0;
let getItemsRequests = 0;
let throttleOnce = true;

const printers = PRODUCTS.filter(
  (product) => product.category === 'impresoras-unas' && product.asin,
).slice(0, 4);

const ASIN_OK_A = printers[0]?.asin ?? '';
const ASIN_OK_B = printers[1]?.asin ?? '';
const ASIN_NO_IMAGE = printers[2]?.asin ?? '';
const ASIN_REJECTED = printers[3]?.asin ?? '';

async function readBody(request: IncomingMessage): Promise<string> {
  request.setEncoding('utf8');
  let body = '';
  for await (const chunk of request) body += chunk as string;
  return body;
}

beforeAll(async () => {
  const handle = async (
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> => {
    const body = await readBody(request);

    if (request.url === '/auth/o2/token') {
      tokenRequests += 1;
      const payload = JSON.parse(body) as Record<string, string>;
      if (
        payload.grant_type !== 'client_credentials' ||
        payload.scope !== 'creatorsapi::default' ||
        !payload.client_id ||
        !payload.client_secret
      ) {
        response.writeHead(400).end('{}');
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json' }).end(
        JSON.stringify({
          access_token: 'token-de-prueba',
          token_type: 'bearer',
          expires_in: 3600,
        }),
      );
      return;
    }

    if (request.url === '/catalog/v1/getItems') {
      getItemsRequests += 1;
      if (request.headers.authorization !== 'Bearer token-de-prueba') {
        response.writeHead(401).end('{}');
        return;
      }
      if (request.headers['x-marketplace'] !== 'www.amazon.es') {
        response.writeHead(400).end('{}');
        return;
      }
      if (throttleOnce) {
        throttleOnce = false;
        response.writeHead(429, { 'retry-after': '0' }).end('{}');
        return;
      }
      const payload = JSON.parse(body) as { itemIds: string[] };
      const items = payload.itemIds
        .filter((asin) => asin !== ASIN_REJECTED)
        .map((asin) => ({
          asin,
          detailPageURL: `https://www.amazon.es/dp/${asin}?tag=tusunas-21`,
          ...(asin === ASIN_NO_IMAGE
            ? {}
            : {
                images: {
                  primary: {
                    large: {
                      url: `https://m.media-amazon.com/images/I/${asin}.jpg`,
                      width: 500,
                      height: 500,
                    },
                  },
                  variants: [
                    {
                      large: {
                        url: `https://m.media-amazon.com/images/I/${asin}-v1.jpg`,
                        width: 500,
                        height: 500,
                      },
                    },
                  ],
                },
              }),
          itemInfo: { title: { displayValue: `Título Amazon de ${asin}` } },
        }));
      response.writeHead(200, { 'content-type': 'application/json' }).end(
        JSON.stringify({
          itemResults: { items },
          errors: [
            {
              code: 'ItemNotAccessible',
              message: 'El item no está accesible para este partnerTag.',
              itemId: ASIN_REJECTED,
            },
          ],
        }),
      );
      return;
    }

    response.writeHead(404).end('{}');
  };

  server = createServer((request, response) => {
    void handle(request, response);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${String(port)}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => {
      resolve();
    });
  });
});

/**
 * Reescribe los hosts de Amazon al servidor local conservando la ruta. Así
 * el código bajo prueba usa sus URLs reales de producción y lo único
 * sustituido es el destino TCP.
 */
const routedFetch: typeof fetch = (input, init) => {
  const requested =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  for (const amazonUrl of [
    CREATORS_API_TOKEN_ENDPOINTS['v3.2'],
    CREATORS_API_GET_ITEMS_URL,
  ]) {
    const parsed = new URL(amazonUrl);
    if (requested === amazonUrl)
      return fetch(`${baseUrl}${parsed.pathname}`, init);
  }
  throw new Error(`URL no enrutada en el test: ${requested}`);
};

describe('contrato completo de Creators API sobre HTTP real', () => {
  it('recorre credenciales → token → GetItems → mapeo → snapshot válido', async () => {
    const credentialsResult = readCreatorsApiCredentials({
      AMAZON_CREATORS_CREDENTIAL_ID: 'id-de-prueba',
      AMAZON_CREATORS_CREDENTIAL_SECRET: 'secreto-de-prueba',
      AMAZON_CREATORS_VERSION: 'v3.2',
    });
    expect(credentialsResult.ok).toBe(true);
    if (!credentialsResult.ok) return;

    const tokenProvider = createCreatorsApiTokenProvider({
      credentials: credentialsResult.credentials,
      fetchImpl: routedFetch,
    });
    const client = createCreatorsApiClient({
      tokenProvider,
      marketplace: 'www.amazon.es',
      partnerTag: 'tusunas-21',
      fetchImpl: routedFetch,
      sleep: () => Promise.resolve(),
    });

    const asins = printers.map((product) => product.asin as string);
    const outcomes = await client.getItems(asins);

    /** Un solo lote (4 ASINs ≤ 10) y un solo token para todos. */
    expect(outcomes).toHaveLength(1);
    expect(tokenRequests).toBe(1);
    /** El 429 inicial se reintentó y acabó resolviendo. */
    expect(getItemsRequests).toBe(2);
    expect(outcomes[0]?.failure).toBeUndefined();

    const entries = [];
    const failures: string[] = [];
    const productByAsin = new Map(
      printers.map((product) => [product.asin as string, product]),
    );
    for (const item of outcomes[0]?.items ?? []) {
      const product = productByAsin.get(item.asin);
      if (!product) continue;
      const mapped = mapCreatorsApiItem({
        product,
        item,
        fetchedAt: new Date().toISOString(),
      });
      if (mapped.ok) entries.push(mapped.entry);
      else failures.push(`${product.id}: ${mapped.rejection.reason}`);
    }

    /** 2 con imagen, 1 sin imagen (rechazado por el mapper), 1 error parcial. */
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.asin).sort()).toEqual(
      [ASIN_OK_A, ASIN_OK_B].sort(),
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('no-image');
    expect(outcomes[0]?.errors[0]?.itemId).toBe(ASIN_REJECTED);

    /** El ASIN rechazado por Amazon nunca llega al snapshot. */
    expect(entries.some((entry) => entry.asin === ASIN_REJECTED)).toBe(false);

    const snapshot = {
      schemaVersion: 1 as const,
      generatedAt: new Date().toISOString(),
      marketplace: 'www.amazon.es',
      partnerTag: 'tusunas-21',
      amazonQueried: true,
      entries,
    };
    expect(amazonMediaSnapshotSchema.safeParse(snapshot).success).toBe(true);

    /** Cada entrada trae URL remota oficial, dimensiones y variante. */
    for (const entry of entries) {
      expect(new URL(entry.media.imageUrl ?? '').hostname).toBe(
        'm.media-amazon.com',
      );
      expect(entry.media.width).toBe(500);
      expect(entry.variants).toHaveLength(1);
      expect(entry.detailPageURL).toContain(entry.asin);
      expect(entry.media.alt).toBe(`Título Amazon de ${entry.asin}`);
    }
  });
});
