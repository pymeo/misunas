import {
  CREATORS_API_GRANT_TYPE,
  CREATORS_API_SCOPE,
  CREATORS_API_TOKEN_ENDPOINTS,
  CREATORS_API_TOKEN_EXPIRY_MARGIN_MS,
} from '@/config/amazonCreators';
import { creatorsApiTokenResponseSchema } from '@/domain/amazonCreators';
import type { CreatorsApiCredentials } from '@/infrastructure/amazon/credentials';

/**
 * Proveedor de access token OAuth 2.0 (Client Credentials) para Amazon
 * Creators API.
 *
 * Tres propiedades que el resto de la integración da por supuestas:
 *  1. NO se pide un token por producto. El token se cachea en memoria y se
 *     reutiliza hasta un margen antes de `expires_in` (los tokens de Amazon
 *     viven 3600 s), así que un sync de 34 ASINs hace 1 petición de token,
 *     no 34.
 *  2. Las peticiones concurrentes comparten la MISMA promesa en vuelo, para
 *     que arrancar varios lotes a la vez no dispare varias autenticaciones.
 *  3. El secreto solo viaja en el cuerpo de la petición a Login with Amazon.
 *     Nunca se escribe en un mensaje de error: si Amazon responde 401, el
 *     error dice el código HTTP y nada más.
 */
export interface TokenProvider {
  getToken(): Promise<string>;
  /** Invalida el token cacheado (tras un 401, por si fue revocado). */
  invalidate(): void;
}

export class CreatorsApiAuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CreatorsApiAuthError';
  }
}

interface CachedToken {
  accessToken: string;
  /** Epoch ms a partir del cual hay que renovar (ya con margen aplicado). */
  renewAfter: number;
}

export interface TokenProviderOptions {
  credentials: CreatorsApiCredentials;
  fetchImpl?: typeof fetch;
  now?: () => number;
  expiryMarginMs?: number;
}

export function createCreatorsApiTokenProvider(
  options: TokenProviderOptions,
): TokenProvider {
  const {
    credentials,
    fetchImpl = fetch,
    now = Date.now,
    expiryMarginMs = CREATORS_API_TOKEN_EXPIRY_MARGIN_MS,
  } = options;
  const endpoint = CREATORS_API_TOKEN_ENDPOINTS[credentials.version];

  let cached: CachedToken | null = null;
  let inFlight: Promise<string> | null = null;

  async function requestToken(): Promise<string> {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        grant_type: CREATORS_API_GRANT_TYPE,
        client_id: credentials.credentialId,
        client_secret: credentials.credentialSecret,
        scope: CREATORS_API_SCOPE,
      }),
    });

    if (!response.ok)
      throw new CreatorsApiAuthError(
        response.status,
        `Login with Amazon rechazó las credenciales (HTTP ${String(response.status)}). Revisa ${credentials.version === 'v3.2' ? 'que la credencial sea europea (v3.2)' : 'la región de la credencial'} y que tenga el scope ${CREATORS_API_SCOPE}.`,
      );

    const parsed = creatorsApiTokenResponseSchema.safeParse(
      await response.json(),
    );
    if (!parsed.success)
      throw new CreatorsApiAuthError(
        response.status,
        'La respuesta de Login with Amazon no tiene la forma esperada (access_token/token_type/expires_in).',
      );
    if (parsed.data.token_type.toLowerCase() !== 'bearer')
      throw new CreatorsApiAuthError(
        response.status,
        `Tipo de token inesperado: ${parsed.data.token_type}.`,
      );

    cached = {
      accessToken: parsed.data.access_token,
      renewAfter: now() + parsed.data.expires_in * 1000 - expiryMarginMs,
    };
    return parsed.data.access_token;
  }

  return {
    async getToken() {
      if (cached && now() < cached.renewAfter) return cached.accessToken;
      inFlight ??= requestToken().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    invalidate() {
      cached = null;
    },
  };
}
