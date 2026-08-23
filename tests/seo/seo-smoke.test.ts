import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const clientRoot = resolve('dist/client');
const parseJson = (value: string): unknown => JSON.parse(value) as unknown;
const launchPages = [
  'es/index.html',
  'es/unas-semicuradas/index.html',
  'es/mejores-unas-semicuradas/index.html',
  'es/unas-semicuradas-francesas/index.html',
  'es/unas-semicuradas-con-lampara/index.html',
  'es/que-son-las-unas-semicuradas/index.html',
  'es/como-poner-unas-semicuradas/index.html',
  'es/como-quitar-unas-semicuradas/index.html',
  'es/calculadora-ahorro-manicura/index.html',
  'es/encuentra-tus-unas/index.html',
  'es/metodologia/index.html',
  'es/sobre-nosotras/index.html',
  'es/aviso-afiliados/index.html',
  'es/privacidad/index.html',
  'es/cookies/index.html',
  'es/aviso-legal/index.html',
];

beforeAll(() => {
  execFileSync('npm', ['run', 'build'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: '1',
      XDG_CONFIG_HOME: '/tmp/tus-unas-config',
    },
  });
}, 60_000);

describe('SEO production smoke tests', () => {
  it.each(launchPages)(
    '%s has core metadata, a clean canonical and exactly one h1',
    (relativePath) => {
      const html = readFileSync(resolve(clientRoot, relativePath), 'utf8');
      expect(html).toMatch(/<html lang="es">/);
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      expect(html).toMatch(/<meta name="description" content="[^"]+">/);
      expect(html).toMatch(
        /<link rel="canonical" href="https:\/\/xn--tus-uas-8za\.com\//,
      );
      expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
      expect(html).not.toMatch(/(?:>|\s)TODO(?:<|:|\s)/);
      expect(html).not.toMatch(
        /coming soon|en preparación|placeholder content/i,
      );
    },
  );

  it('publishes only canonical, indexable routes in sitemap and safe robots rules', () => {
    const sitemap = readFileSync(resolve(clientRoot, 'sitemap.xml'), 'utf8');
    const robots = readFileSync(resolve(clientRoot, 'robots.txt'), 'utf8');
    expect(sitemap).toContain('https://xn--tus-uas-8za.com/es/');
    expect(sitemap).toContain('/es/unas-semicuradas-francesas/');
    expect(sitemap).not.toContain('tus-uñas.com');
    expect(sitemap).not.toMatch(
      /plantilla-review|protocolo-pruebas|\/productos\/|\/api\/|\/privacidad\//,
    );
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('https://xn--tus-uas-8za.com/sitemap.xml');
  });

  it('excludes drafts and noindexes 404, legal, hubs and product utility pages', () => {
    expect(
      existsSync(
        resolve(
          clientRoot,
          'es/articulos/elegir-formato-manicura-casa/index.html',
        ),
      ),
    ).toBe(false);
    for (const relativePath of [
      '404.html',
      'es/privacidad/index.html',
      'es/cookies/index.html',
      'es/aviso-legal/index.html',
      'es/comparativas/index.html',
      'es/guias/index.html',
      'es/herramientas/index.html',
      'es/opiniones/index.html',
      'es/productos/jmeowio-francesa-rosa/index.html',
    ]) {
      expect(readFileSync(resolve(clientRoot, relativePath), 'utf8')).toContain(
        '<meta name="robots" content="noindex, nofollow">',
      );
    }
  });

  it('emits parseable JSON-LD without unsubstantiated review or offer data', () => {
    for (const relativePath of [
      'es/index.html',
      'es/productos/jmeowio-francesa-rosa/index.html',
    ]) {
      const html = readFileSync(resolve(clientRoot, relativePath), 'utf8');
      const scripts = [
        ...html.matchAll(
          /<script type="application\/ld\+json">([^<]+)<\/script>/g,
        ),
      ];
      expect(scripts.length).toBeGreaterThan(0);
      for (const match of scripts)
        expect(() => parseJson(match[1] ?? '')).not.toThrow();
      expect(html).not.toMatch(
        /AggregateRating|ratingValue|reviewCount|"offers"|"price"/,
      );
    }
  });

  it('ships the real catalog, affiliate attributes and no development fixtures', () => {
    const comparison = readFileSync(
      resolve(clientRoot, 'es/mejores-unas-semicuradas/index.html'),
      'utf8',
    );
    const recommender = readFileSync(
      resolve(clientRoot, 'es/encuentra-tus-unas/index.html'),
      'utf8',
    );
    expect(`${comparison}${recommender}`).not.toMatch(
      /Marca de ejemplo|\(SAMPLE\)/,
    );
    expect(recommender).toContain('JMEOWIO');
    expect(comparison).toContain('?tag=tusunas-21');
    expect(comparison).toContain('rel="sponsored nofollow noopener"');
    expect(comparison).toContain('Ver precio actualizado en Amazon');
  });

  it('uses the mandatory Amazon disclosure near commercial content', () => {
    const html = readFileSync(
      resolve(clientRoot, 'es/mejores-unas-semicuradas/index.html'),
      'utf8',
    );
    expect(html).toContain(
      'En calidad de Afiliado de Amazon, obtengo ingresos por las compras adscritas que cumplen los requisitos aplicables',
    );
  });
});
