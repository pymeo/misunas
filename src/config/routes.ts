import { PRODUCTS, PUBLISHED_BRANDS } from '@/data/products';

export const INDEXABLE_STATIC_PATHS = [
  '/es/', '/es/unas-semicuradas/', '/es/mejores-unas-semicuradas/',
  '/es/que-son-las-unas-semicuradas/', '/es/como-poner-unas-semicuradas/',
  '/es/como-quitar-unas-semicuradas/', '/es/comparar/', '/es/comparativas/',
  '/es/guias/', '/es/herramientas/', '/es/opiniones/', '/es/calculadora-ahorro-manicura/',
  '/es/encuentra-tus-unas/', '/es/sobre-nosotras/', '/es/metodologia/', '/es/aviso-afiliados/',
] as const;

export const PRODUCT_PATHS = PRODUCTS.filter((product) => product.active && product.editorialStatus === 'approved').map((product) => `/es/productos/${product.slug}/`);
export const BRAND_PATHS = PUBLISHED_BRANDS.map((brand) => `/es/marcas/${brand}/`);
