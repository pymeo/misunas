export type NailStyleTone =
  'bold' | 'floral' | 'french' | 'ombre' | 'nude' | 'rose';

/**
 * Única fuente de verdad de "qué tono de manicura representa este producto"
 * a partir de sus styleTags — usada tanto por NailStylePreview (SSR) como
 * por el recomendador (cliente), para que nunca diverjan entre sí.
 */
export function getNailStyleTone(styleTags: string[]): NailStyleTone {
  const tags = new Set(styleTags);
  if (tags.has('llamativa') || tags.has('leopardo')) return 'bold';
  if (tags.has('floral')) return 'floral';
  if (tags.has('francesa')) return 'french';
  if (tags.has('ombre') || tags.has('degradado')) return 'ombre';
  if (tags.has('nude') || tags.has('natural')) return 'nude';
  return 'rose';
}

/** Paleta en hex, para contextos (como JS de cliente) sin acceso a clases Tailwind. */
export const NAIL_TONE_HEX: Record<NailStyleTone, [string, string, string]> = {
  bold: ['#713f61', '#d96b78', '#75648d'],
  floral: ['#ffffff', '#f7e8e7', '#ffffff'],
  french: ['#e9b9ae', '#edc7bd', '#e2aea5'],
  ombre: ['#f7d9d4', '#e3a3ac', '#c96a7c'],
  nude: ['#d8a99d', '#e6bdb2', '#c9948c'],
  rose: ['#cf8495', '#e4a2ad', '#a96d82'],
};
