import type { Product } from '@/domain/product';

interface CategoryMeta {
  label: string;
  href: string;
}

export const CATEGORY_META: Partial<Record<Product['category'], CategoryMeta>> =
  {
    'unas-semicuradas': {
      label: 'Uñas semicuradas',
      href: '/es/unas-semicuradas/',
    },
    'gel-nail-wraps': {
      label: 'Uñas semicuradas',
      href: '/es/unas-semicuradas/',
    },
    tornos: { label: 'Tornos para uñas', href: '/es/tornos-unas/' },
    'aspiradores-polvo-unas': {
      label: 'Aspiradores de polvo',
      href: '/es/aspiradores-polvo-unas/',
    },
  };

export const DEFAULT_CATEGORY_META: CategoryMeta = {
  label: 'Catálogo',
  href: '/es/',
};

export const getCategoryMeta = (category: Product['category']): CategoryMeta =>
  CATEGORY_META[category] ?? DEFAULT_CATEGORY_META;
