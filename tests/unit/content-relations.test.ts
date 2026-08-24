import { describe, expect, it } from 'vitest';
import {
  CONTENT_RELATIONS,
  getRelatedContent,
} from '@/config/contentRelations';

describe('CONTENT_RELATIONS', () => {
  it('nunca supera 5 enlaces por bloque (no bloques gigantes de "también te puede interesar")', () => {
    for (const [path, links] of Object.entries(CONTENT_RELATIONS))
      expect(links.length, path).toBeLessThanOrEqual(5);
  });

  it('cada entrada apunta a una ruta interna con barra final', () => {
    for (const links of Object.values(CONTENT_RELATIONS))
      for (const link of links) {
        expect(link.href.startsWith('/es/')).toBe(true);
        expect(link.href.endsWith('/')).toBe(true);
      }
  });

  it('ninguna página se enlaza a sí misma', () => {
    for (const [path, links] of Object.entries(CONTENT_RELATIONS))
      expect(links.some((link) => link.href === path)).toBe(false);
  });

  it('getRelatedContent devuelve vacío para una ruta sin relaciones declaradas', () => {
    expect(getRelatedContent('/es/no-existe/')).toEqual([]);
  });
});
