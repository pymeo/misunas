import { describe, expect, it } from 'vitest';
import { CREATORS_API_ENV_VARS } from '@/config/amazonCreators';
import {
  describeCredentials,
  readCreatorsApiCredentials,
} from '@/infrastructure/amazon/credentials';

const ID = 'amzn-credential-id-de-prueba';
const SECRET = 'amzn-credential-secret-de-prueba-0123456789';

const env = (overrides: Record<string, string | undefined> = {}) => ({
  [CREATORS_API_ENV_VARS.credentialId]: ID,
  [CREATORS_API_ENV_VARS.credentialSecret]: SECRET,
  ...overrides,
});

describe('readCreatorsApiCredentials', () => {
  it('lee las credenciales del entorno con v3.2 (Europa) por defecto', () => {
    const result = readCreatorsApiCredentials(env());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.credentials.credentialId).toBe(ID);
    expect(result.credentials.credentialSecret).toBe(SECRET);
    expect(result.credentials.version).toBe('v3.2');
  });

  it('respeta la versión explícita de la credencial', () => {
    const result = readCreatorsApiCredentials(
      env({ [CREATORS_API_ENV_VARS.version]: 'v3.1' }),
    );
    expect(result.ok && result.credentials.version).toBe('v3.1');
  });

  it('rechaza una versión desconocida sin lanzar', () => {
    const result = readCreatorsApiCredentials(
      env({ [CREATORS_API_ENV_VARS.version]: 'v9.9' }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain(CREATORS_API_ENV_VARS.version);
  });

  it('la ausencia de credenciales es un estado válido: no lanza y dice qué falta', () => {
    const result = readCreatorsApiCredentials({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual([
      CREATORS_API_ENV_VARS.credentialId,
      CREATORS_API_ENV_VARS.credentialSecret,
    ]);
  });

  it('trata una credencial en blanco como ausente', () => {
    const result = readCreatorsApiCredentials(
      env({ [CREATORS_API_ENV_VARS.credentialSecret]: '   ' }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual([CREATORS_API_ENV_VARS.credentialSecret]);
  });
});

describe('no exposición de secretos', () => {
  it('JSON.stringify de las credenciales no filtra ningún valor', () => {
    const result = readCreatorsApiCredentials(env());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.credentials);
    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain(ID);
    expect(serialized).toContain('[REDACTED]');
  });

  it('interpolar las credenciales en una plantilla no filtra ningún valor', () => {
    const result = readCreatorsApiCredentials(env());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    /**
     * Interpolar el objeto es exactamente el descuido que esta prueba
     * verifica, así que se silencia la regla que lo prohíbe: lo que se
     * comprueba es que el `toString` redactado lo hace inofensivo.
     */
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const message = `credenciales: ${String(result.credentials)}`;
    expect(message).not.toContain(SECRET);
    expect(message).not.toContain(ID);
  });

  it('el mensaje de "falta una variable" nombra la variable, nunca un valor', () => {
    const result = readCreatorsApiCredentials({
      [CREATORS_API_ENV_VARS.credentialId]: ID,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain(CREATORS_API_ENV_VARS.credentialSecret);
    expect(result.reason).not.toContain(ID);
  });

  it('describeCredentials solo expone longitudes, ni un fragmento del valor', () => {
    const result = readCreatorsApiCredentials(env());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const described = describeCredentials(result.credentials);
    expect(described).toContain('v3.2');
    expect(described).toContain(String(SECRET.length));
    expect(described).not.toContain(SECRET);
    expect(described).not.toContain(ID);
    /** Ni siquiera un prefijo corto del secreto. */
    expect(described).not.toContain(SECRET.slice(0, 6));
    expect(described).not.toContain(ID.slice(0, 6));
  });
});
