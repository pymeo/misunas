import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AMAZON_IMAGE_HOSTS,
  CREATORS_API_ENV_VARS,
} from '@/config/amazonCreators';

/**
 * Higiene de secretos y coherencia de la CSP, verificadas contra los
 * ficheros REALMENTE versionados (`git ls-files`), no contra el árbol de
 * trabajo: lo que importa es qué llega a GitHub.
 *
 * Los patrones de abajo son prefijos públicos del FORMATO de credencial de
 * Amazon, no credenciales. Sirven para que una credencial pegada por error
 * en cualquier fichero del repo rompa el build en vez de publicarse.
 */

const CREDENTIAL_PATTERNS: { name: string; pattern: RegExp }[] = [
  {
    name: 'LWA client id',
    pattern: /amzn1\.application-oa2-client\.[0-9a-f]{8}/i,
  },
  { name: 'LWA client secret', pattern: /amzn1\.oa2-cs\.v1\.[0-9a-f]{8}/i },
  { name: 'LWA refresh token', pattern: /\bAtzr\|[A-Za-z0-9_-]{20}/ },
  { name: 'LWA access token', pattern: /\bAtza\|[A-Za-z0-9_-]{20}/ },
  { name: 'AWS access key id', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
];

const SELF = 'tests/unit/amazon-secret-hygiene.test.ts';

const trackedFiles = (): string[] =>
  execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((file) => file.length > 0 && file !== SELF);

const readTracked = (file: string): string => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};

describe('ninguna credencial versionada', () => {
  it('ningún fichero de Git contiene un credential id, secret o token de Amazon/AWS', () => {
    const hits: string[] = [];
    for (const file of trackedFiles()) {
      const content = readTracked(file);
      if (!content) continue;
      for (const { name, pattern } of CREDENTIAL_PATTERNS)
        if (pattern.test(content)) hits.push(`${file}: posible ${name}`);
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('el historial de Git tampoco contiene credenciales con esos formatos', () => {
    const log = execFileSync(
      'git',
      ['log', '--all', '--format=%H%n%B', '--max-count=500'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    for (const { name, pattern } of CREDENTIAL_PATTERNS)
      expect(pattern.test(log), `mensaje de commit con posible ${name}`).toBe(
        false,
      );
  });

  it('.dev.vars y el snapshot generado están ignorados por Git', () => {
    const tracked = new Set(trackedFiles());
    expect(tracked.has('.dev.vars')).toBe(false);
    expect(
      [...tracked].filter((file) => file.startsWith('src/data/generated/')),
    ).toEqual([]);

    const ignored = execFileSync(
      'git',
      [
        'check-ignore',
        '.dev.vars',
        '.dev.vars.local',
        'src/data/generated/amazon-media-snapshot.json',
      ],
      { encoding: 'utf8' },
    );
    expect(ignored).toContain('.dev.vars');
    expect(ignored).toContain('src/data/generated/');
  });

  it('.env.example declara los NOMBRES de las credenciales y ningún valor', () => {
    const content = readTracked('.env.example');
    for (const name of [
      CREATORS_API_ENV_VARS.credentialId,
      CREATORS_API_ENV_VARS.credentialSecret,
    ]) {
      expect(content).toContain(name);
      /** La variable debe quedar vacía: `NOMBRE=` y nada más en la línea. */
      expect(content).toMatch(new RegExp(`^${name}=\\s*$`, 'm'));
    }
  });

  it('wrangler.jsonc no declara ninguna variable de credencial', () => {
    const content = readTracked('wrangler.jsonc');
    expect(content).not.toContain(CREATORS_API_ENV_VARS.credentialId);
    expect(content).not.toContain(CREATORS_API_ENV_VARS.credentialSecret);
    expect(content).not.toContain('amzn1.');
  });

  it('ningún fixture ni test incrusta una credencial con formato de Amazon', () => {
    for (const file of trackedFiles().filter(
      (candidate) =>
        candidate.startsWith('tests/') || candidate.endsWith('.seed.json'),
    )) {
      const content = readTracked(file);
      for (const { name, pattern } of CREDENTIAL_PATTERNS)
        expect(pattern.test(content), `${file}: posible ${name}`).toBe(false);
    }
  });
});

describe('CSP coherente con la allowlist de hosts de imagen', () => {
  const headers = readTracked('public/_headers');

  /**
   * Se parte de la línea real de la cabecera, no del fichero entero: los
   * comentarios de `_headers` también mencionan `img-src`, y leerlos daría
   * un falso verde.
   */
  const cspLine =
    headers
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('Content-Security-Policy:')) ?? '';
  const imgSrc = /img-src ([^;]+)/.exec(cspLine)?.[1]?.trim() ?? '';

  it('la cabecera CSP existe y declara img-src', () => {
    expect(cspLine).not.toBe('');
    expect(imgSrc).not.toBe('');
  });

  it('todo host de AMAZON_IMAGE_HOSTS figura en img-src', () => {
    for (const host of AMAZON_IMAGE_HOSTS)
      expect(imgSrc, `img-src no autoriza ${host}`).toContain(
        `https://${host}`,
      );
  });

  it('img-src sigue siendo una allowlist: ni comodín ni https: abierto', () => {
    expect(imgSrc).not.toContain('*');
    expect(imgSrc.split(/\s+/)).not.toContain('https:');
  });

  it('no se autorizan hosts de imagen fuera de la allowlist del código', () => {
    const remoteHosts = imgSrc
      .split(/\s+/)
      .filter((token) => token.startsWith('https://'))
      .map((token) => token.replace('https://', ''));
    expect(remoteHosts.sort()).toEqual([...AMAZON_IMAGE_HOSTS].sort());
  });
});
