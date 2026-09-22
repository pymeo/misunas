import { expect, test, type Page } from '@playwright/test';

/**
 * Comportamiento de las imágenes de Amazon en un navegador real.
 *
 * La prueba se adapta al build: si el snapshot de Amazon está vacío (el
 * estado por defecto, sin credenciales), no hay imágenes remotas que
 * comprobar y las aserciones específicas se omiten en vez de fallar — así
 * este spec es válido tanto en un CI sin credenciales como en un build con
 * media real.
 */

const AMAZON_IMAGE = /m\.media-amazon\.com/;

const PAGES = [
  '/es/impresoras-unas-3d/',
  '/es/productos/sunseota-impresora-unas-3d-smart/',
];

const countAmazonImages = (page: Page) =>
  page.locator('img[src*="m.media-amazon.com"]').count();

test.describe('media oficial de Amazon', () => {
  for (const path of PAGES) {
    test(`${path} — toda imagen remota declara width/height y no se deforma`, async ({
      page,
    }) => {
      await page.goto(path);
      const images = page.locator('img[src*="m.media-amazon.com"]');
      const total = await images.count();
      test.skip(total === 0, 'build sin snapshot de Amazon');

      for (let index = 0; index < total; index += 1) {
        const image = images.nth(index);
        /** width/height explícitos: sin ellos habría CLS al cargar. */
        await expect(image).toHaveAttribute('width', /^\d+$/);
        await expect(image).toHaveAttribute('height', /^\d+$/);
        await expect(image).toHaveAttribute('alt', /\S/);
        const objectFit = await image.evaluate(
          (node) => getComputedStyle(node).objectFit,
        );
        expect(objectFit).toBe('contain');
      }
    });

    test(`${path} — como máximo una imagen eager (candidata a LCP)`, async ({
      page,
    }) => {
      await page.goto(path);
      const eager = await page.locator('img[loading="eager"]').count();
      const priority = await page.locator('img[fetchpriority="high"]').count();
      expect(eager).toBeLessThanOrEqual(1);
      expect(priority).toBeLessThanOrEqual(1);
    });
  }

  test('si la imagen de Amazon no carga, aparece el fallback editorial', async ({
    page,
  }) => {
    /** Se aborta todo lo que venga de Amazon: simula caída del CDN o URL caducada. */
    await page.route(AMAZON_IMAGE, (route) => route.abort());
    await page.goto('/es/productos/sunseota-impresora-unas-3d-smart/');

    const fallback = page.locator(
      '#visual-fallback-sunseota-impresora-unas-3d-smart',
    );
    await expect(fallback).toBeVisible();
    /** El hueco de la imagen fallida no queda vacío ni visible. */
    await expect(
      page.locator('img[src*="m.media-amazon.com"]').first(),
    ).toBeHidden();
    /** La tira de miniaturas también se retira, no deja restos. */
    await expect(page.locator('[data-product-gallery] ul')).toBeHidden();
  });

  test('con Amazon caído la página sigue respondiendo y con CTA usable', async ({
    page,
  }) => {
    await page.route(AMAZON_IMAGE, (route) => route.abort());
    const response = await page.goto('/es/impresoras-unas-3d/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    const cta = page.locator('a.amazon-cta').first();
    await expect(cta).toHaveAttribute('rel', 'sponsored nofollow noopener');
    await expect(cta).toHaveAttribute('href', /amazon\.es/);
    await expect(cta).toHaveAttribute('href', /tag=tusunas-21/);
  });

  test('la galería cambia la imagen principal al pulsar una miniatura', async ({
    page,
  }) => {
    await page.goto('/es/productos/sunseota-impresora-unas-3d-smart/');
    const strip = page.locator('[data-product-gallery]');
    test.skip((await strip.count()) === 0, 'build sin variantes de Amazon');

    const main = page.locator('img[id^="gallery-main-"]').first();
    const before = await main.getAttribute('src');
    const secondThumb = strip.locator('button[data-gallery-src]').nth(1);
    const expected = await secondThumb.getAttribute('data-gallery-src');
    await secondThumb.click();

    await expect(main).toHaveAttribute('src', expected ?? '');
    expect(expected).not.toBe(before);
    await expect(secondThumb).toHaveAttribute('aria-pressed', 'true');
  });

  for (const viewport of [
    { name: 'móvil', width: 390, height: 844 },
    { name: 'tablet', width: 820, height: 1180 },
    { name: 'escritorio', width: 1440, height: 900 },
  ])
    test(`sin desbordamiento horizontal en ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const path of PAGES) {
        await page.goto(path);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(
          overflow,
          `${path} desborda en ${viewport.name}`,
        ).toBeLessThanOrEqual(1);
      }
    });

  test('las miniaturas de la galería son lazy, solo la principal puede ser eager', async ({
    page,
  }) => {
    await page.goto('/es/productos/sunseota-impresora-unas-3d-smart/');
    test.skip(
      (await countAmazonImages(page)) === 0,
      'build sin snapshot de Amazon',
    );
    const thumbs = page.locator('[data-product-gallery] ul img');
    const total = await thumbs.count();
    for (let index = 0; index < total; index += 1)
      await expect(thumbs.nth(index)).toHaveAttribute('loading', 'lazy');
  });
});
