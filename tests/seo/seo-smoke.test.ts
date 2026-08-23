import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const clientRoot = resolve('dist/client');
const publicPages = [
  'es/index.html',
  'es/unas-semicuradas/index.html',
  'es/mejores-unas-semicuradas/index.html',
  'es/que-son-las-unas-semicuradas/index.html',
  'es/como-poner-unas-semicuradas/index.html',
  'es/como-quitar-unas-semicuradas/index.html',
  'es/calculadora-ahorro-manicura/index.html',
  'es/encuentra-tus-unas/index.html',
  'es/aviso-afiliados/index.html',
  'es/privacidad/index.html',
  'es/cookies/index.html',
  'es/aviso-legal/index.html',
  'es/articulos/elegir-formato-manicura-casa/index.html',
];

beforeAll(() => {
  if (!existsSync(resolve(clientRoot, 'es/index.html'))) {
    execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
  }
});

describe('SEO production smoke tests', () => {
  it.each(publicPages)(
    '%s has core metadata and exactly one h1',
    (relativePath) => {
      const html = readFileSync(resolve(clientRoot, relativePath), 'utf8');
      expect(html).toMatch(/<html lang="es">/);
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      expect(html).toMatch(/<meta name="description" content="[^"]+">/);
      expect(html).toMatch(
        /<link rel="canonical" href="https:\/\/xn--tus-uas-8za\.com\//,
      );
      expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    },
  );

  it('publishes safe sitemap and robots files without draft URLs', () => {
    const sitemap = readFileSync(resolve(clientRoot, 'sitemap.xml'), 'utf8');
    const robots = readFileSync(resolve(clientRoot, 'robots.txt'), 'utf8');
    expect(sitemap).toContain('https://xn--tus-uas-8za.com/es/');
    expect(sitemap).not.toContain('tus-uñas.com');
    expect(sitemap).not.toMatch(/plantilla-review|protocolo-pruebas/);
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('https://xn--tus-uas-8za.com/sitemap.xml');
  });

  it('excludes drafts, marks the 404 noindex and emits parseable JSON-LD', () => {
    expect(
      existsSync(resolve(clientRoot, 'es/reviews/plantilla-review/index.html')),
    ).toBe(false);
    const notFound = readFileSync(resolve(clientRoot, '404.html'), 'utf8');
    expect(notFound).toContain(
      '<meta name="robots" content="noindex, nofollow">',
    );
    const home = readFileSync(resolve(clientRoot, 'es/index.html'), 'utf8');
    const scripts = [
      ...home.matchAll(
        /<script type="application\/ld\+json">([^<]+)<\/script>/g,
      ),
    ];
    expect(scripts.length).toBeGreaterThanOrEqual(2);
    for (const match of scripts) {
      const parse = () => {
        JSON.parse(match[1] ?? '');
      };
      expect(parse).not.toThrow();
    }
  });

  it('does not expose development product fixtures in production HTML', () => {
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
    expect(recommender).toContain('data-products="[]"');
  });
});
