import {
  CREATORS_API_ENV_VARS,
  CREATORS_API_VERSIONS,
  DEFAULT_CREATORS_API_VERSION,
  type CreatorsApiVersion,
} from '@/config/amazonCreators';

/**
 * Credenciales de Amazon Creators API leídas del entorno. Nunca se
 * construyen a partir de literales del repositorio: los valores solo existen
 * en `.dev.vars`/variables de entorno locales o en los Secrets del CI.
 *
 * `toJSON`/`toString` están sobrescritos para que un `console.log`,
 * `JSON.stringify` o una plantilla de error nunca puedan volcar el secreto
 * por accidente — el caso realista de fuga en logs. Ver
 * `tests/unit/amazon-credentials.test.ts`.
 */
export interface CreatorsApiCredentials {
  readonly credentialId: string;
  readonly credentialSecret: string;
  readonly version: CreatorsApiVersion;
}

const REDACTED = '[REDACTED]';

export type CredentialsReadResult =
  | { ok: true; credentials: CreatorsApiCredentials }
  | { ok: false; missing: string[]; reason: string };

export interface EnvSource {
  readonly [key: string]: string | undefined;
}

function isVersion(value: string): value is CreatorsApiVersion {
  return (CREATORS_API_VERSIONS as string[]).includes(value);
}

function redactedProperties(): PropertyDescriptorMap {
  return {
    toJSON: {
      value: () => ({ credentialId: REDACTED, credentialSecret: REDACTED }),
      enumerable: false,
    },
    toString: {
      value: () => `CreatorsApiCredentials(${REDACTED})`,
      enumerable: false,
    },
  };
}

/**
 * Lee las credenciales sin lanzar: la ausencia de credenciales es un estado
 * legítimo (CI público, build sin Amazon) que debe degradar al fallback
 * editorial, no romper el build. Devuelve los NOMBRES de las variables que
 * faltan, jamás un valor.
 */
export function readCreatorsApiCredentials(
  env: EnvSource = process.env,
): CredentialsReadResult {
  const credentialId = env[CREATORS_API_ENV_VARS.credentialId]?.trim() ?? '';
  const credentialSecret =
    env[CREATORS_API_ENV_VARS.credentialSecret]?.trim() ?? '';
  const rawVersion = env[CREATORS_API_ENV_VARS.version]?.trim();

  const missing: string[] = [];
  if (!credentialId) missing.push(CREATORS_API_ENV_VARS.credentialId);
  if (!credentialSecret) missing.push(CREATORS_API_ENV_VARS.credentialSecret);
  if (missing.length > 0)
    return {
      ok: false,
      missing,
      reason: `Faltan variables de entorno: ${missing.join(', ')}.`,
    };

  if (rawVersion !== undefined && rawVersion !== '' && !isVersion(rawVersion))
    return {
      ok: false,
      missing: [CREATORS_API_ENV_VARS.version],
      reason: `${CREATORS_API_ENV_VARS.version} debe ser una de ${CREATORS_API_VERSIONS.join(', ')} (Europa/España es v3.2).`,
    };

  const credentials = Object.defineProperties(
    {
      credentialId,
      credentialSecret,
      version:
        rawVersion !== undefined && rawVersion !== '' && isVersion(rawVersion)
          ? rawVersion
          : DEFAULT_CREATORS_API_VERSION,
    },
    redactedProperties(),
  ) as CreatorsApiCredentials;

  return { ok: true, credentials };
}

/**
 * Metadatos seguros para logs e informes: longitudes y prefijo de tipo, sin
 * ningún fragmento del identificador ni del secreto.
 */
export function describeCredentials(
  credentials: CreatorsApiCredentials,
): string {
  return `credencial ${credentials.version} presente (id: ${String(credentials.credentialId.length)} car., secreto: ${String(credentials.credentialSecret.length)} car.)`;
}
