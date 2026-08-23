import { expect, test } from '@playwright/test';

const routes = [
  '/es/',
  '/es/encuentra-tus-unas/',
  '/es/comparar/',
  '/es/tornos-unas/',
  '/es/aspiradores-polvo-unas/',
  '/es/productos/ohora-n-cream-cotton/',
  '/es/productos/kredioo-torno-profesional-35000-rpm/',
  '/es/productos/anbeistee-colector-polvo-2000pa/',
];

const widths = [320, 360, 375, 390, 430, 768, 1024, 1440];

for (const route of routes) {
  test.describe(route, () => {
    for (const width of widths) {
      test(`sin scroll horizontal del documento a ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          overflow.scrollWidth,
          `documentElement.scrollWidth (${overflow.scrollWidth}) > clientWidth (${overflow.clientWidth}) en ${route} a ${width}px`,
        ).toBeLessThanOrEqual(overflow.clientWidth);
      });
    }
  });
}
