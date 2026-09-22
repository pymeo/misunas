import {
  CREATORS_API_GET_ITEMS_URL,
  CREATORS_API_MAX_ITEM_IDS,
  CREATORS_API_MAX_RETRIES,
  CREATORS_API_RESOURCES,
  CREATORS_API_RETRY_BASE_DELAY_MS,
} from '@/config/amazonCreators';
import {
  creatorsApiGetItemsResponseSchema,
  type CreatorsApiError,
  type CreatorsApiItem,
} from '@/domain/amazonCreators';
import {
  CreatorsApiAuthError,
  type TokenProvider,
} from '@/infrastructure/amazon/tokenProvider';

/**
 * Cliente HTTP de Amazon Creators API (operación GetItems).
 *
 * Responsabilidades, y solo estas: batching, autenticación delegada,
 * reintentos y validación de la forma de la respuesta. No sabe nada del
 * dominio de Tus-Uñas — el mapeo vive en
 * `src/application/amazon/creatorsMediaMapper.ts`.
 *
 * Nunca lanza por un fallo de Amazon: devuelve un `BatchOutcome` por lote
 * distinguiendo explícitamente entre fallo COMPLETO del lote (transporte,
 * HTTP, auth, respuesta ilegible) y fallo PARCIAL (Amazon devolvió unos
 * items y errores para otros ASINs). Una caída de Amazon se traduce en
 * outcomes con `failure`, que el llamante convierte en fallback editorial.
 */

export type BatchFailureKind =
  'auth' | 'throttled' | 'transport' | 'http' | 'malformed';

export interface BatchFailure {
  kind: BatchFailureKind;
  message: string;
  status?: number;
  /** Número de intentos realizados (1 = sin reintentos). */
  attempts: number;
}

export interface BatchOutcome {
  /** ASINs solicitados en este lote, en el orden enviado. */
  asins: string[];
  /** Items devueltos. Puede venir en orden distinto al solicitado. */
  items: CreatorsApiItem[];
  /** Errores por ASIN (fallo parcial) o globales del lote. */
  errors: CreatorsApiError[];
  /** Presente solo si el lote falló por completo. */
  failure?: BatchFailure;
  attempts: number;
}

export interface CreatorsApiClient {
  getItems(asins: string[]): Promise<BatchOutcome[]>;
}

export interface CreatorsApiClientOptions {
  tokenProvider: TokenProvider;
  marketplace: string;
  partnerTag: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  baseDelayMs?: number;
  /** Inyectable para hacer el backoff determinista en test. */
  jitter?: () => number;
}

/** Códigos HTTP que merecen reintento: throttling y fallos transitorios del servidor. */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export function chunkAsins(
  asins: string[],
  size = CREATORS_API_MAX_ITEM_IDS,
): string[][] {
  const unique = [...new Set(asins)];
  const batches: string[][] = [];
  for (let index = 0; index < unique.length; index += size)
    batches.push(unique.slice(index, index + size));
  return batches;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

export function createCreatorsApiClient(
  options: CreatorsApiClientOptions,
): CreatorsApiClient {
  const {
    tokenProvider,
    marketplace,
    partnerTag,
    fetchImpl = fetch,
    sleep = defaultSleep,
    maxRetries = CREATORS_API_MAX_RETRIES,
    baseDelayMs = CREATORS_API_RETRY_BASE_DELAY_MS,
    jitter = Math.random,
  } = options;

  function backoffDelay(attempt: number): number {
    /** 2^n con jitter completo, para no sincronizar reintentos entre lotes. */
    const exponential = baseDelayMs * 2 ** (attempt - 1);
    return Math.round(exponential * (0.5 + jitter() * 0.5));
  }

  async function requestBatch(asins: string[]): Promise<BatchOutcome> {
    let lastFailure: BatchFailure | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      let token: string;
      try {
        token = await tokenProvider.getToken();
      } catch (error) {
        const isAuth = error instanceof CreatorsApiAuthError;
        lastFailure = {
          kind: isAuth ? 'auth' : 'transport',
          message:
            error instanceof Error
              ? error.message
              : 'Error de autenticación desconocido.',
          ...(isAuth ? { status: error.status } : {}),
          attempts: attempt,
        };
        /** Una credencial rechazada no se arregla reintentando. */
        if (isAuth && error.status !== 429 && error.status < 500) break;
        if (attempt < maxRetries) await sleep(backoffDelay(attempt));
        continue;
      }

      let response: Response;
      try {
        response = await fetchImpl(CREATORS_API_GET_ITEMS_URL, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
            accept: 'application/json',
            'x-marketplace': marketplace,
          },
          body: JSON.stringify({
            itemIds: asins,
            itemIdType: 'ASIN',
            marketplace,
            partnerTag,
            resources: [...CREATORS_API_RESOURCES],
          }),
        });
      } catch (error) {
        lastFailure = {
          kind: 'transport',
          message:
            error instanceof Error
              ? error.message
              : 'Fallo de red desconocido.',
          attempts: attempt,
        };
        if (attempt < maxRetries) await sleep(backoffDelay(attempt));
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        /** Token posiblemente revocado: se invalida y se reintenta una vez. */
        tokenProvider.invalidate();
        lastFailure = {
          kind: 'auth',
          message: `Amazon rechazó la petición (HTTP ${String(response.status)}). Credencial sin acceso a Creators API, marketplace no autorizado o partnerTag que no corresponde a la cuenta.`,
          status: response.status,
          attempts: attempt,
        };
        if (attempt === 1 && maxRetries > 1) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        break;
      }

      if (RETRYABLE_STATUSES.has(response.status)) {
        const throttled = response.status === 429;
        lastFailure = {
          kind: throttled ? 'throttled' : 'http',
          message: `Amazon respondió HTTP ${String(response.status)}${throttled ? ' (throttling)' : ''}.`,
          status: response.status,
          attempts: attempt,
        };
        if (attempt < maxRetries) {
          const retryAfter = parseRetryAfter(
            response.headers.get('retry-after'),
          );
          await sleep(retryAfter ?? backoffDelay(attempt));
          continue;
        }
        break;
      }

      if (!response.ok) {
        lastFailure = {
          kind: 'http',
          message: `Amazon respondió HTTP ${String(response.status)} (no reintentable).`,
          status: response.status,
          attempts: attempt,
        };
        break;
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        lastFailure = {
          kind: 'malformed',
          message: 'La respuesta de Amazon no era JSON válido.',
          status: response.status,
          attempts: attempt,
        };
        break;
      }

      const parsed = creatorsApiGetItemsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        lastFailure = {
          kind: 'malformed',
          message: `La respuesta de Amazon no cumple el contrato esperado: ${parsed.error.issues[0]?.message ?? 'forma inesperada'}.`,
          status: response.status,
          attempts: attempt,
        };
        break;
      }

      return {
        asins,
        items: parsed.data.items,
        errors: parsed.data.errors,
        attempts: attempt,
      };
    }

    return {
      asins,
      items: [],
      errors: [],
      failure: lastFailure ?? {
        kind: 'transport',
        message: 'El lote no se pudo completar.',
        attempts: maxRetries,
      },
      attempts: lastFailure?.attempts ?? maxRetries,
    };
  }

  return {
    async getItems(asins) {
      const outcomes: BatchOutcome[] = [];
      /** Secuencial a propósito: respeta el TPS asignado sin depender de suerte. */
      for (const batch of chunkAsins(asins))
        outcomes.push(await requestBatch(batch));
      return outcomes;
    },
  };
}
