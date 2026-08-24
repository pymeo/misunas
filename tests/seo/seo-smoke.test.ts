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
  'es/tornos-unas/index.html',
  'es/aspiradores-polvo-unas/index.html',
  'es/impresoras-unas-3d/index.html',
  'es/impresoras-unas-3d/como-funcionan/index.html',
  'es/impresoras-unas-3d/precio/index.html',
  'es/impresoras-unas-3d/profesionales/index.html',
  'es/impresoras-unas-3d/4800-vs-12000-dpi/index.html',
  'es/impresoras-unas-3d/cartuchos-y-consumibles/index.html',
  'es/calculadora-ahorro-manicura/index.html',
  'es/calculadora-rentabilidad-impresora-unas/index.html',
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
    expect(sitemap).toContain('/es/tornos-unas/');
    expect(sitemap).toContain('/es/aspiradores-polvo-unas/');
    expect(sitemap).toContain('/es/impresoras-unas-3d/');
    expect(sitemap).toContain('/es/impresoras-unas-3d/como-funcionan/');
    expect(sitemap).toContain('/es/calculadora-rentabilidad-impresora-unas/');
    expect(sitemap).not.toContain('tus-uñas.com');
    expect(sitemap).not.toMatch(
      /plantilla-review|protocolo-pruebas|\/api\/|\/privacidad\//,
    );
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('https://xn--tus-uas-8za.com/sitemap.xml');
  });

  it('sitemap includes exactly the seoIndexable products, no more and no less (Fase 2/11)', () => {
    const sitemap = readFileSync(resolve(clientRoot, 'sitemap.xml'), 'utf8');
    const indexableProductPaths = [
      '/es/productos/beurer-mp62-set-manicura-pedicura/',
      '/es/productos/melodysusie-colector-polvo-profesional/',
      '/es/productos/ohora-n-cream-cotton/',
      '/es/productos/nailog-maze/',
      '/es/productos/nailog-meadow/',
      '/es/productos/mylee-diva-sin-lampara/',
    ];
    for (const path of indexableProductPaths) expect(sitemap).toContain(path);
    const productLocs = [
      ...sitemap.matchAll(/<loc>[^<]*(\/es\/productos\/[^<]+\/)<\/loc>/g),
    ].map((match) => match[1]);
    expect(new Set(productLocs)).toEqual(new Set(indexableProductPaths));
  });

  it('never lets a noindex product ficha slip into the sitemap, and every sitemap URL resolves to a page without noindex', () => {
    const sitemap = readFileSync(resolve(clientRoot, 'sitemap.xml'), 'utf8');
    const stillNoindexProductPaths = [
      'es/productos/jmeowio-francesa-rosa/index.html',
      'es/productos/kredioo-torno-profesional-35000-rpm/index.html',
      'es/productos/anbeistee-colector-polvo-2000pa/index.html',
      'es/productos/sunseota-impresora-unas-3d-smart/index.html',
    ];
    for (const relativePath of stillNoindexProductPaths) {
      expect(sitemap).not.toContain(
        `/${relativePath.replace('index.html', '')}`,
      );
      expect(readFileSync(resolve(clientRoot, relativePath), 'utf8')).toContain(
        '<meta name="robots" content="noindex, nofollow">',
      );
    }
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => new URL(match[1] ?? '').pathname,
    );
    expect(locs.length).toBeGreaterThan(0);
    for (const pathname of locs) {
      const filePath = resolve(clientRoot, `${pathname.slice(1)}index.html`);
      if (!existsSync(filePath)) continue;
      expect(
        readFileSync(filePath, 'utf8'),
        `${pathname} está en el sitemap pero su HTML lleva noindex`,
      ).not.toContain('<meta name="robots" content="noindex, nofollow">');
    }
  });

  it('an indexable product ficha is not noindex and carries its own canonical', () => {
    const html = readFileSync(
      resolve(clientRoot, 'es/productos/ohora-n-cream-cotton/index.html'),
      'utf8',
    );
    expect(html).not.toContain(
      '<meta name="robots" content="noindex, nofollow">',
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://xn--tus-uas-8za.com/es/productos/ohora-n-cream-cotton/">',
    );
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
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
      'es/productos/kredioo-torno-profesional-35000-rpm/index.html',
      'es/productos/anbeistee-colector-polvo-2000pa/index.html',
      'es/productos/sunseota-impresora-unas-3d-smart/index.html',
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
      'es/productos/kredioo-torno-profesional-35000-rpm/index.html',
      'es/productos/sunseota-impresora-unas-3d-smart/index.html',
      'es/tornos-unas/index.html',
      'es/aspiradores-polvo-unas/index.html',
      'es/impresoras-unas-3d/index.html',
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

  it('renders an editorial Product review (Team author, positiveNotes) on a ficha with enough real content', () => {
    const html = readFileSync(
      resolve(
        clientRoot,
        'es/productos/kredioo-torno-profesional-35000-rpm/index.html',
      ),
      'utf8',
    );
    const scripts = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([^<]+)<\/script>/g,
      ),
    ];
    const productLd = scripts
      .map((match) => parseJson(match[1] ?? '') as Record<string, unknown>)
      .find((entry) => entry['@type'] === 'Product');
    expect(productLd).toBeDefined();
    const reviews = productLd?.review as Record<string, unknown>[] | undefined;
    expect(reviews?.length).toBeGreaterThan(0);
    const editorial = reviews?.find(
      (entry) =>
        (entry.author as Record<string, unknown> | undefined)?.['@type'] ===
        'Team',
    );
    expect(editorial).toBeDefined();
    expect(editorial?.author).toEqual({
      '@type': 'Team',
      name: 'Equipo editorial de Tus-Uñas',
    });
    expect(editorial?.reviewRating).toBeUndefined();
    expect(html).not.toMatch(/ratingValue/);
    // El contenido del JSON-LD también debe verse en la página (nunca solo en el schema).
    expect(html).toContain('Lo que más nos gusta');
    expect(html).toContain('Aspectos a considerar');
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

  it('keeps machinery (tornos, aspiradores) out of the semicuradas recommender', () => {
    const recommender = readFileSync(
      resolve(clientRoot, 'es/encuentra-tus-unas/index.html'),
      'utf8',
    );
    expect(recommender).not.toMatch(/nail_drill|nail_dust_collector/);
  });

  it('ships working tornos, aspiradores and impresoras landing pages with real CTAs', () => {
    for (const relativePath of [
      'es/tornos-unas/index.html',
      'es/aspiradores-polvo-unas/index.html',
      'es/impresoras-unas-3d/index.html',
    ]) {
      const html = readFileSync(resolve(clientRoot, relativePath), 'utf8');
      expect(html).toContain('?tag=tusunas-21');
      expect(html).toContain('rel="sponsored nofollow noopener"');
    }
  });

  it('server-renders a Top 3 editorial pick near the top of every money page', () => {
    for (const relativePath of [
      'es/mejores-unas-semicuradas/index.html',
      'es/tornos-unas/index.html',
      'es/aspiradores-polvo-unas/index.html',
      'es/impresoras-unas-3d/index.html',
    ]) {
      const html = readFileSync(resolve(clientRoot, relativePath), 'utf8');
      const topPicksIndex = html.indexOf('id="nuestra-seleccion"');
      const comparisonIndex = html.indexOf('Comparación esencial');
      expect(topPicksIndex).toBeGreaterThan(0);
      expect(comparisonIndex).toBeGreaterThan(topPicksIndex);
      expect(html).toContain('🥇');
      expect(html).toContain('Por qué lo elegimos');
    }
  });

  it('never invents numeric scores or ratings for editorial picks', () => {
    for (const relativePath of [
      'es/mejores-unas-semicuradas/index.html',
      'es/tornos-unas/index.html',
      'es/aspiradores-polvo-unas/index.html',
      'es/impresoras-unas-3d/index.html',
    ]) {
      const html = readFileSync(resolve(clientRoot, relativePath), 'utf8');
      expect(html).not.toMatch(/\d(?:[.,]\d)?\s*\/\s*10\b/);
      expect(html).not.toMatch(/\d(?:[.,]\d)?\s*(?:estrellas|★)/i);
      expect(html).not.toMatch(/\b\d{2,3}\s*%\s*(?:compatible|match)/i);
    }
  });

  it('never hotlinks a remote image (CSP only allows img-src self/data:)', () => {
    for (const relativePath of [
      'es/index.html',
      'es/mejores-unas-semicuradas/index.html',
      'es/tornos-unas/index.html',
      'es/aspiradores-polvo-unas/index.html',
      'es/impresoras-unas-3d/index.html',
      'es/comparar/index.html',
      'es/encuentra-tus-unas/index.html',
      'es/productos/kredioo-torno-profesional-35000-rpm/index.html',
      'es/productos/sunseota-impresora-unas-3d-smart/index.html',
    ]) {
      const html = readFileSync(resolve(clientRoot, relativePath), 'utf8');
      expect(html).not.toMatch(/<img[^>]+src="https?:\/\//);
    }
  });

  it('always renders a product visual (real image or editorial fallback), never an empty slot', () => {
    for (const relativePath of [
      'es/productos/kredioo-torno-profesional-35000-rpm/index.html',
      'es/productos/anbeistee-colector-polvo-2000pa/index.html',
      'es/productos/ohora-n-cream-cotton/index.html',
      'es/productos/sunseota-impresora-unas-3d-smart/index.html',
    ]) {
      const html = readFileSync(resolve(clientRoot, relativePath), 'utf8');
      expect(html).toMatch(/role="img"/);
    }
  });

  it('keeps the image CSP allowlist explicit (self/data: only) until Creators API is really connected', () => {
    const headers = readFileSync(resolve('public/_headers'), 'utf8');
    const cspLine = headers
      .split('\n')
      .find((line) => line.includes('Content-Security-Policy:'));
    expect(cspLine).toBeDefined();
    expect(cspLine).toContain("img-src 'self' data:");
    expect(cspLine).not.toMatch(/img-src[^;]*https:(?!\/\/)/);
    expect(cspLine).not.toMatch(/img-src[^;]*\*/);
    expect(cspLine).not.toContain('media-amazon.com');
  });

  it('renders the printer ROI calculator with editable defaults and no invented market prices', () => {
    const html = readFileSync(
      resolve(
        clientRoot,
        'es/calculadora-rentabilidad-impresora-unas/index.html',
      ),
      'utf8',
    );
    expect(html).toContain('data-printer-roi-calculator');
    expect(html).toMatch(/name="machinePrice"[^>]*value="\d/);
    expect(html).not.toMatch(/coming soon|en preparación/i);
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
