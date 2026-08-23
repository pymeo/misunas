import { SITE_URL } from '@/config/site';

export interface TranslationPath {
  locale: 'es' | 'en' | 'fr';
  path: string;
}

export function buildHreflangLinks(translations: TranslationPath[]) {
  const links = translations.map(({ locale, path }) => ({
    hreflang: locale,
    href: new URL(path, SITE_URL).toString(),
  }));
  const spanish = links.find((link) => link.hreflang === 'es');
  return spanish
    ? [...links, { hreflang: 'x-default', href: spanish.href }]
    : links;
}
