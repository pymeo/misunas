import { describe, expect, it, vi, type Mock } from 'vitest';
import {
  CREATORS_API_GET_ITEMS_URL,
  CREATORS_API_MAX_ITEM_IDS,
  CREATORS_API_RESOURCES,
} from '@/config/amazonCreators';
import {
  chunkAsins,
  createCreatorsApiClient,
} from '@/infrastructure/amazon/creatorsApiClient';
import {
  ASSOCIATE_NOT_ELIGIBLE,
  parseCreatorsApiFault,
} from '@/domain/amazonCreators';
import {
  CreatorsApiAuthError,
  type TokenProvider,
} from '@/infrastructure/amazon/tokenProvider';

const asin = (index: number): string =>
  `B${String(index).padStart(9, '0')}`.slice(0, 10).toUpperCase();

function stubTokenProvider(token = 'access-token'): TokenProvider {
  return {
    getToken: () => Promise.resolve(token),
    invalidate: () => undefined,
  };
}

interface ClientHarness {
  fetchImpl: Mock<typeof fetch>;
  /** Tipado para poder leer los retardos del backoff sin `any`. */
  sleep: Mock<(ms: number) => Promise<void>>;
  client: ReturnType<typeof createCreatorsApiClient>;
}

function harness(
  responses: (Response | Error)[],
  tokenProvider: TokenProvider = stubTokenProvider(),
): ClientHarness {
  const queue = [...responses];
  const fetchImpl = vi.fn().mockImplementation(() => {
    const next = queue.shift();
    if (next === undefined) throw new Error('fetch inesperado: cola vacía');
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
  const sleep = vi.fn<(ms: number) => Promise<void>>(() => Promise.resolve());
  return {
    fetchImpl,
    sleep,
    client: createCreatorsApiClient({
      tokenProvider,
      marketplace: 'www.amazon.es',
      partnerTag: 'tusunas-21',
      fetchImpl,
      sleep,
      /** Backoff determinista. */
      jitter: () => 0,
    }),
  };
}

/** `RequestInit.body` es un `BodyInit`; aquí siempre se envía como string. */
const bodyOf = (init: RequestInit): string =>
  typeof init.body === 'string' ? init.body : '';

const json = (
  payload: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const itemsPayload = (asins: string[]) => ({
  itemResults: {
    items: asins.map((value) => ({
      asin: value,
      detailPageURL: `https://www.amazon.es/dp/${value}?tag=tusunas-21`,
      images: {
        primary: {
          large: {
            url: `https://m.media-amazon.com/images/I/${value}.jpg`,
            width: 500,
            height: 500,
          },
        },
      },
      itemInfo: { title: { displayValue: `Producto ${value}` } },
    })),
  },
});

describe('chunkAsins — batching', () => {
  it('agrupa en lotes de 10, el máximo del contrato de GetItems', () => {
    const batches = chunkAsins(Array.from({ length: 34 }, (_, i) => asin(i)));
    expect(batches).toHaveLength(4);
    expect(batches.map((batch) => batch.length)).toEqual([10, 10, 10, 4]);
    expect(CREATORS_API_MAX_ITEM_IDS).toBe(10);
  });

  it('deduplica ASINs repetidos antes de agrupar', () => {
    expect(chunkAsins(['B000000001', 'B000000001', 'B000000002'])).toEqual([
      ['B000000001', 'B000000002'],
    ]);
  });

  it('devuelve una lista vacía sin ASINs', () => {
    expect(chunkAsins([])).toEqual([]);
  });
});

describe('getItems — petición', () => {
  it('hace 4 peticiones para 34 ASINs, no 34', async () => {
    const asins = Array.from({ length: 34 }, (_, i) => asin(i));
    const { client, fetchImpl } = harness([
      json(itemsPayload(asins.slice(0, 10))),
      json(itemsPayload(asins.slice(10, 20))),
      json(itemsPayload(asins.slice(20, 30))),
      json(itemsPayload(asins.slice(30))),
    ]);

    const outcomes = await client.getItems(asins);

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(outcomes.flatMap((outcome) => outcome.items)).toHaveLength(34);
  });

  it('envía el contrato correcto: itemIds, itemIdType, marketplace, partnerTag y resources', async () => {
    const { client, fetchImpl } = harness([json(itemsPayload(['B000000001']))]);
    await client.getItems(['B000000001']);

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(CREATORS_API_GET_ITEMS_URL);
    expect(url).toBe('https://creatorsapi.amazon/catalog/v1/getItems');
    const body = JSON.parse(bodyOf(init)) as Record<string, unknown>;
    expect(body.itemIds).toEqual(['B000000001']);
    expect(body.itemIdType).toBe('ASIN');
    expect(body.marketplace).toBe('www.amazon.es');
    expect(body.partnerTag).toBe('tusunas-21');
    expect(body.resources).toEqual(Array.from(CREATORS_API_RESOURCES));
    /** Sin offersV2: no publicamos precios (solo 1 h de caché autorizada). */
    expect(bodyOf(init)).not.toContain('offers');
  });

  it('envía la cabecera x-marketplace y el Bearer del token', async () => {
    const { client, fetchImpl } = harness([json(itemsPayload(['B000000001']))]);
    await client.getItems(['B000000001']);

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['x-marketplace']).toBe('www.amazon.es');
    expect(headers.authorization).toBe('Bearer access-token');
  });
});

describe('getItems — parsing de la respuesta', () => {
  it('acepta el sobre itemResults (documentación de la operación)', async () => {
    const { client } = harness([json(itemsPayload(['B000000001']))]);
    const [outcome] = await client.getItems(['B000000001']);
    expect(outcome?.items[0]?.asin).toBe('B000000001');
  });

  it('acepta también el sobre itemsResult (guía de migración desde PA-API)', async () => {
    const { client } = harness([
      json({
        itemsResult: {
          items: [
            {
              asin: 'B000000001',
              images: {
                primary: {
                  large: {
                    url: 'https://m.media-amazon.com/images/I/x.jpg',
                    width: 500,
                    height: 500,
                  },
                },
              },
            },
          ],
        },
      }),
    ]);
    const [outcome] = await client.getItems(['B000000001']);
    expect(outcome?.items[0]?.asin).toBe('B000000001');
  });

  it('normaliza variants tanto si llega como array como si llega como objeto', async () => {
    const image = (url: string) => ({
      large: { url, width: 500, height: 500 },
    });
    const { client } = harness([
      json({
        itemResults: {
          items: [
            {
              asin: 'B000000001',
              images: {
                primary: image('https://m.media-amazon.com/images/I/p.jpg'),
                variants: [
                  image('https://m.media-amazon.com/images/I/v1.jpg'),
                  image('https://m.media-amazon.com/images/I/v2.jpg'),
                ],
              },
            },
            {
              asin: 'B000000002',
              images: {
                primary: image('https://m.media-amazon.com/images/I/p2.jpg'),
                variants: image('https://m.media-amazon.com/images/I/v3.jpg'),
              },
            },
          ],
        },
      }),
    ]);
    const [outcome] = await client.getItems(['B000000001', 'B000000002']);
    expect(outcome?.items[0]?.images?.variants).toHaveLength(2);
    expect(outcome?.items[1]?.images?.variants).toHaveLength(1);
  });

  it('marca la respuesta como malformada cuando no cumple el contrato', async () => {
    const { client } = harness([json({ unexpected: true, itemResults: 42 })]);
    const [outcome] = await client.getItems(['B000000001']);
    expect(outcome?.failure?.kind).toBe('malformed');
    expect(outcome?.items).toEqual([]);
  });

  it('marca la respuesta como malformada cuando no es JSON', async () => {
    const { client } = harness([
      new Response('<html>502</html>', { status: 200 }),
    ]);
    const [outcome] = await client.getItems(['B000000001']);
    expect(outcome?.failure?.kind).toBe('malformed');
  });
});

describe('getItems — errores parciales vs completos', () => {
  it('distingue un fallo PARCIAL: devuelve los items buenos y los errores por ASIN', async () => {
    const { client } = harness([
      json({
        ...itemsPayload(['B000000001']),
        errors: [
          {
            code: 'ItemNotAccessible',
            message: 'El item no está accesible.',
            itemId: 'B000000002',
          },
        ],
      }),
    ]);

    const [outcome] = await client.getItems(['B000000001', 'B000000002']);

    expect(outcome?.failure).toBeUndefined();
    expect(outcome?.items).toHaveLength(1);
    expect(outcome?.errors).toHaveLength(1);
    expect(outcome?.errors[0]?.itemId).toBe('B000000002');
  });

  it('un fallo COMPLETO del lote no devuelve items y sí un failure tipado', async () => {
    const { client } = harness([
      json(
        { errors: [{ code: 'InvalidPartnerTag', message: 'Tag inválido.' }] },
        400,
      ),
    ]);

    const [outcome] = await client.getItems(['B000000001']);

    expect(outcome?.items).toEqual([]);
    expect(outcome?.failure?.kind).toBe('http');
    expect(outcome?.failure?.status).toBe(400);
  });

  it('un lote fallido no impide que los demás lotes se resuelvan', async () => {
    const asins = Array.from({ length: 20 }, (_, i) => asin(i));
    const { client } = harness([
      new Response('', { status: 400 }),
      json(itemsPayload(asins.slice(10, 20))),
    ]);

    const outcomes = await client.getItems(asins);

    expect(outcomes[0]?.failure?.kind).toBe('http');
    expect(outcomes[1]?.failure).toBeUndefined();
    expect(outcomes[1]?.items).toHaveLength(10);
  });
});

describe('getItems — throttling y reintentos', () => {
  it('reintenta con backoff exponencial ante un 429 y acaba resolviendo', async () => {
    const { client, fetchImpl, sleep } = harness([
      new Response('', { status: 429 }),
      new Response('', { status: 429 }),
      json(itemsPayload(['B000000001'])),
    ]);

    const [outcome] = await client.getItems(['B000000001']);

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(outcome?.items).toHaveLength(1);
    expect(outcome?.attempts).toBe(3);
    /** 500 · 2^0 y 500 · 2^1, con jitter fijado a 0 → mitad del nominal. */
    expect(sleep.mock.calls.map((call): number => call[0])).toEqual([250, 500]);
  });

  it('respeta Retry-After cuando Amazon lo envía', async () => {
    const { client, sleep } = harness([
      new Response('', { status: 429, headers: { 'retry-after': '3' } }),
      json(itemsPayload(['B000000001'])),
    ]);

    await client.getItems(['B000000001']);

    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it('reintenta los 5xx transitorios', async () => {
    const { client, fetchImpl } = harness([
      new Response('', { status: 503 }),
      json(itemsPayload(['B000000001'])),
    ]);
    const [outcome] = await client.getItems(['B000000001']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(outcome?.items).toHaveLength(1);
  });

  it('reintenta un fallo de red y lo clasifica como transporte si persiste', async () => {
    const { client, fetchImpl } = harness([
      new Error('ECONNRESET'),
      new Error('ECONNRESET'),
      new Error('ECONNRESET'),
      new Error('ECONNRESET'),
    ]);
    const [outcome] = await client.getItems(['B000000001']);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(outcome?.failure?.kind).toBe('transport');
  });

  it('NO reintenta un 404: no es transitorio', async () => {
    const { client, fetchImpl, sleep } = harness([
      new Response('', { status: 404 }),
    ]);
    const [outcome] = await client.getItems(['B000000001']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(outcome?.failure?.kind).toBe('http');
  });

  it('ante un 401 invalida el token y reintenta una vez antes de rendirse', async () => {
    const invalidate = vi.fn();
    const { client, fetchImpl } = harness(
      [new Response('', { status: 401 }), new Response('', { status: 401 })],
      { getToken: () => Promise.resolve('t'), invalidate },
    );

    const [outcome] = await client.getItems(['B000000001']);

    expect(invalidate).toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(outcome?.failure?.kind).toBe('auth');
  });

  it('una credencial rechazada en el token no se reintenta en bucle', async () => {
    const getToken = vi
      .fn()
      .mockRejectedValue(new CreatorsApiAuthError(401, 'credencial rechazada'));
    const { client, fetchImpl } = harness([], {
      getToken,
      invalidate: () => undefined,
    });

    const [outcome] = await client.getItems(['B000000001']);

    expect(getToken).toHaveBeenCalledTimes(1);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(outcome?.failure?.kind).toBe('auth');
  });
});

describe('parseCreatorsApiFault', () => {
  it('extrae reason y message del cuerpo de error real de un 403', () => {
    const fault = parseCreatorsApiFault(
      '{"message":"Your account does not currently meet the eligibility requirements.","reason":"AssociateNotEligible","type":"AccessDeniedException"}',
    );
    expect(fault?.reason).toBe(ASSOCIATE_NOT_ELIGIBLE);
    expect(fault?.message).toContain('eligibility requirements');
    expect(fault?.type).toBe('AccessDeniedException');
  });

  it('extrae el motivo de un partner tag no vinculado al marketplace', () => {
    const fault = parseCreatorsApiFault(
      '{"message":"Your credential is not linked to the partner tag in the request for the given Marketplace.","reason":"InvalidAssociate","type":"ValidationException"}',
    );
    expect(fault?.reason).toBe('InvalidAssociate');
  });

  it('devuelve null si el cuerpo no es JSON o no tiene forma de fault', () => {
    expect(parseCreatorsApiFault('<html>503</html>')).toBeNull();
    expect(parseCreatorsApiFault('{}')).toBeNull();
    expect(parseCreatorsApiFault('')).toBeNull();
  });
});

describe('motivo real de Amazon en los fallos de autorización', () => {
  const notEligible = () =>
    new Response(
      '{"message":"Your account does not currently meet the eligibility requirements.","reason":"AssociateNotEligible","type":"AccessDeniedException"}',
      { status: 403, headers: { 'content-type': 'application/json' } },
    );

  it('propaga reason y message de Amazon en vez de una lista de sospechosos', async () => {
    const { client } = harness([notEligible()]);
    const [outcome] = await client.getItems(['B000000001']);

    expect(outcome?.failure?.kind).toBe('auth');
    expect(outcome?.failure?.status).toBe(403);
    expect(outcome?.failure?.amazonReason).toBe(ASSOCIATE_NOT_ELIGIBLE);
    expect(outcome?.failure?.message).toContain('eligibility requirements');
  });

  it('NO reintenta un 403 con motivo explícito: es una decisión permanente', async () => {
    const { client, fetchImpl, sleep } = harness([notEligible()]);
    const [outcome] = await client.getItems(['B000000001']);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(outcome?.attempts).toBe(1);
  });

  it('un 401 SIN motivo sí se reintenta una vez (token posiblemente revocado)', async () => {
    const { client, fetchImpl } = harness([
      new Response('', { status: 401 }),
      new Response('', { status: 401 }),
    ]);
    await client.getItems(['B000000001']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('un 4xx no reintentable también expone el mensaje de Amazon', async () => {
    const { client } = harness([
      new Response(
        '{"message":"1 validation error detected","reason":"FieldValidationFailed","type":"ValidationException"}',
        { status: 400 },
      ),
    ]);
    const [outcome] = await client.getItems(['B000000001']);

    expect(outcome?.failure?.kind).toBe('http');
    expect(outcome?.failure?.amazonReason).toBe('FieldValidationFailed');
    expect(outcome?.failure?.message).toContain('validation error');
  });

  it('un 403 sin cuerpo legible sigue produciendo un fallo claro', async () => {
    const { client } = harness([
      new Response('<html>Forbidden</html>', { status: 403 }),
      new Response('<html>Forbidden</html>', { status: 403 }),
    ]);
    const [outcome] = await client.getItems(['B000000001']);
    expect(outcome?.failure?.kind).toBe('auth');
    expect(outcome?.failure?.amazonReason).toBeUndefined();
    expect(outcome?.failure?.message).toContain('sin detallar el motivo');
  });
});
