import { describe, expect, it, vi } from 'vitest';
import {
  CREATORS_API_SCOPE,
  CREATORS_API_TOKEN_ENDPOINTS,
} from '@/config/amazonCreators';
import type { CreatorsApiCredentials } from '@/infrastructure/amazon/credentials';
import {
  CreatorsApiAuthError,
  createCreatorsApiTokenProvider,
} from '@/infrastructure/amazon/tokenProvider';

const CREDENTIALS: CreatorsApiCredentials = {
  credentialId: 'test-credential-id',
  credentialSecret: 'test-credential-secret',
  version: 'v3.2',
};

/** `RequestInit.body` es un `BodyInit`; aquí siempre se envía como string. */
const bodyOf = (init: RequestInit): string =>
  typeof init.body === 'string' ? init.body : '';

const tokenResponse = (accessToken: string, expiresIn = 3600): Response =>
  new Response(
    JSON.stringify({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresIn,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

describe('createCreatorsApiTokenProvider — OAuth 2.0 client credentials', () => {
  it('pide el token al endpoint europeo cuando la credencial es v3.2', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenResponse('token-eu'));
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: fetchImpl,
    });

    await provider.getToken();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      CREATORS_API_TOKEN_ENDPOINTS['v3.2'],
    );
    expect(CREATORS_API_TOKEN_ENDPOINTS['v3.2']).toBe(
      'https://api.amazon.co.uk/auth/o2/token',
    );
  });

  it('usa el endpoint de cada región según la versión de la credencial', async () => {
    for (const version of ['v3.1', 'v3.2', 'v3.3'] as const) {
      const fetchImpl = vi.fn().mockResolvedValue(tokenResponse('t'));
      const provider = createCreatorsApiTokenProvider({
        credentials: { ...CREDENTIALS, version },
        fetchImpl: fetchImpl,
      });
      await provider.getToken();
      expect(fetchImpl.mock.calls[0]?.[0]).toBe(
        CREATORS_API_TOKEN_ENDPOINTS[version],
      );
    }
  });

  it('envía grant_type=client_credentials y el scope de Creators API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenResponse('token'));
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: fetchImpl,
    });

    await provider.getToken();

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(bodyOf(init)) as Record<string, unknown>;
    expect(init.method).toBe('POST');
    expect(body.grant_type).toBe('client_credentials');
    expect(body.scope).toBe(CREATORS_API_SCOPE);
    expect(body.scope).toBe('creatorsapi::default');
    expect(body.client_id).toBe(CREDENTIALS.credentialId);
    expect(body.client_secret).toBe(CREDENTIALS.credentialSecret);
  });

  it('devuelve el access_token de la respuesta', async () => {
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: vi.fn().mockResolvedValue(tokenResponse('el-token')),
    });
    expect(await provider.getToken()).toBe('el-token');
  });
});

describe('caché de token', () => {
  it('NO pide un token nuevo por producto: reutiliza el cacheado', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenResponse('token'));
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: fetchImpl,
    });

    /** Simula los 34 ASINs del catálogo pidiendo token uno a uno. */
    for (let index = 0; index < 34; index += 1) await provider.getToken();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('renueva el token poco antes de expires_in, no después', async () => {
    let now = 1_000_000;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('primero', 3600))
      .mockResolvedValueOnce(tokenResponse('segundo', 3600));
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: fetchImpl,
      now: () => now,
      expiryMarginMs: 60_000,
    });

    expect(await provider.getToken()).toBe('primero');

    /** A falta de 61 s para caducar sigue sirviendo el cacheado. */
    now += (3600 - 61) * 1000;
    expect(await provider.getToken()).toBe('primero');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    /** Dentro del margen de seguridad ya renueva, antes de que caduque. */
    now += 2000;
    expect(await provider.getToken()).toBe('segundo');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('varias peticiones concurrentes comparten una sola autenticación', async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchImpl = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: fetchImpl,
    });

    const pending = Promise.all([
      provider.getToken(),
      provider.getToken(),
      provider.getToken(),
    ]);
    resolveFetch?.(tokenResponse('compartido'));

    expect(await pending).toEqual(['compartido', 'compartido', 'compartido']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('invalidate() fuerza una autenticación nueva', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('viejo'))
      .mockResolvedValueOnce(tokenResponse('nuevo'));
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: fetchImpl,
    });

    expect(await provider.getToken()).toBe('viejo');
    provider.invalidate();
    expect(await provider.getToken()).toBe('nuevo');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('errores de autenticación', () => {
  it('lanza CreatorsApiAuthError con el status cuando Amazon rechaza la credencial', async () => {
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: vi
        .fn()
        .mockResolvedValue(
          new Response('{"error":"invalid_client"}', { status: 401 }),
        ),
    });

    await expect(provider.getToken()).rejects.toBeInstanceOf(
      CreatorsApiAuthError,
    );
  });

  it('el mensaje de error NUNCA contiene el credential id ni el secreto', async () => {
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: vi
        .fn()
        .mockResolvedValue(
          new Response('{"error":"invalid_client"}', { status: 401 }),
        ),
    });

    await expect(provider.getToken()).rejects.toThrow(
      /Login with Amazon rechazó las credenciales \(HTTP 401\)/,
    );
    const error = await provider.getToken().catch((caught: unknown) => caught);
    const serialized = `${String(error)}${
      error instanceof Error ? (error.stack ?? '') : ''
    }`;
    expect(serialized).not.toContain(CREDENTIALS.credentialSecret);
    expect(serialized).not.toContain(CREDENTIALS.credentialId);
  });

  it('rechaza una respuesta de token con forma inesperada', async () => {
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ access_token: 'x' }), { status: 200 }),
        ),
    });
    await expect(provider.getToken()).rejects.toThrow(/no tiene la forma/);
  });

  it('rechaza un token_type que no sea bearer', async () => {
    const provider = createCreatorsApiTokenProvider({
      credentials: CREDENTIALS,
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'x',
            token_type: 'mac',
            expires_in: 3600,
          }),
          { status: 200 },
        ),
      ),
    });
    await expect(provider.getToken()).rejects.toThrow(/Tipo de token/);
  });
});
