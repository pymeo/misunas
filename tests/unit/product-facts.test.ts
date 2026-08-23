import { describe, expect, it } from 'vitest';
import { getProductFactRows } from '@/application/product-facts';
import { PRODUCTS } from '@/data/products';

const findProduct = (id: string) => {
  const product = PRODUCTS.find((candidate) => candidate.id === id);
  if (!product) throw new Error(`Producto de prueba no encontrado: ${id}`);
  return product;
};

const labelsOf = (rows: { label: string }[]) => rows.map((row) => row.label);

describe('getProductFactRows', () => {
  it('muestra Tipo, Tiras, Lámpara e Incluida para semicuradas (comportamiento actual)', () => {
    const rows = getProductFactRows(findProduct('ohora-n-cream-cotton'));
    expect(labelsOf(rows)).toEqual(['Tipo', 'Tiras', 'Lámpara', 'Incluida']);
    expect(rows.find((row) => row.label === 'Lámpara')?.value).toBe(
      'Necesaria',
    );
  });
  it('omite la fila Tiras cuando stripCount no está confirmado', () => {
    const rows = getProductFactRows(findProduct('jmeowio-estampado-leopardo'));
    expect(labelsOf(rows)).not.toContain('Tiras');
  });
  it('muestra todas las specs de torno cuando la ficha las confirma', () => {
    const rows = getProductFactRows(
      findProduct('kredioo-torno-profesional-35000-rpm'),
    );
    expect(labelsOf(rows)).toEqual([
      'Tipo',
      'Velocidad máxima',
      'Accesorios',
      'Recargable',
      'USB',
      'Pedal',
      'Giro',
      'Pantalla',
    ]);
    expect(rows.find((row) => row.label === 'Velocidad máxima')?.value).toBe(
      '35.000 RPM',
    );
    expect(rows.find((row) => row.label === 'Giro')?.value).toBe(
      'Bidireccional',
    );
    expect(rows).not.toContainEqual(
      expect.objectContaining({ label: 'Lámpara' }),
    );
  });
  it('omite las specs de torno que no están confirmadas (null/undefined)', () => {
    const rows = getProductFactRows(
      findProduct('ponoseu-torno-profesional-portatil'),
    );
    expect(labelsOf(rows)).toEqual(['Tipo', 'Recargable', 'Pedal']);
    expect(rows.find((row) => row.label === 'Recargable')?.value).toBe('Sí');
    expect(rows.find((row) => row.label === 'Pedal')?.value).toBe(
      'No incluido',
    );
  });
  it('muestra Succión en Pa y filtros desechables cuando la ficha los confirma', () => {
    const rows = getProductFactRows(
      findProduct('anbeistee-colector-polvo-2000pa'),
    );
    expect(labelsOf(rows)).toEqual(['Tipo', 'Succión', 'Filtro', 'Luz']);
    expect(rows.find((row) => row.label === 'Succión')?.value).toBe('2000 Pa');
    expect(rows.find((row) => row.label === 'Filtro')?.value).toBe(
      '45 filtros desechables',
    );
  });
  it('distingue filtro reutilizable de desechable', () => {
    const rows = getProductFactRows(findProduct('layhou-aspirador-unas-80w'));
    expect(rows.find((row) => row.label === 'Filtro')?.value).toBe(
      'Reutilizable',
    );
  });
  it('omite las specs de aspirador que no están confirmadas (null/undefined)', () => {
    const rows = getProductFactRows(
      findProduct('cris-nails-aspirador-polvo-manicura'),
    );
    expect(labelsOf(rows)).toEqual(['Tipo', 'Recargable', 'Luz']);
  });
});
