export const SITE_HOST = 'xn--tus-uas-8za.com';
export const SITE_URL = `https://${SITE_HOST}` as const;
export const SITE_NAME = 'Tus-Uñas';
export const DEFAULT_LOCALE = 'es' as const;
export const SUPPORTED_LOCALES = ['es', 'en', 'fr'] as const;
export const PUBLISHED_LOCALES = ['es'] as const;

export const AMAZON_CONFIG = {
  affiliateTag: 'tusunas-21',
  marketplace: 'es',
} as const;

export const MINIMUM_STATISTICS_SAMPLE_SIZE = 10;
