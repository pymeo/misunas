import { describe, expect, it } from 'vitest';
import { businessEventSchema } from '@/application/api/business-event-handler';

describe('businessEventSchema', () => {
  it('acepta calculator_completed sin calculadora indicada (compatibilidad con la existente)', () => {
    expect(() =>
      businessEventSchema.parse({ type: 'calculator_completed' }),
    ).not.toThrow();
  });

  it('acepta calculator_completed con la nueva calculadora de rentabilidad', () => {
    expect(() =>
      businessEventSchema.parse({
        type: 'calculator_completed',
        calculator: 'rentabilidad-impresora',
      }),
    ).not.toThrow();
  });

  it('rechaza un nombre de calculadora fuera del vocabulario cerrado', () => {
    expect(() =>
      businessEventSchema.parse({
        type: 'calculator_completed',
        calculator: 'inventada',
      }),
    ).toThrow();
  });

  it('acepta top_pick_impression con productId, category y sourcePage', () => {
    expect(() =>
      businessEventSchema.parse({
        type: 'top_pick_impression',
        productId: 'sunseota-impresora-unas-3d-smart',
        category: 'impresoras-unas',
        sourcePage: '/es/impresoras-unas-3d/',
      }),
    ).not.toThrow();
  });

  it('rechaza top_pick_impression sin productId', () => {
    expect(() =>
      businessEventSchema.parse({
        type: 'top_pick_impression',
        category: 'impresoras-unas',
        sourcePage: '/es/impresoras-unas-3d/',
      }),
    ).toThrow();
  });

  it('acepta comparator_used con category y sourcePage, sin productId', () => {
    expect(() =>
      businessEventSchema.parse({
        type: 'comparator_used',
        category: 'tornos',
        sourcePage: '/es/comparar/',
      }),
    ).not.toThrow();
  });

  it('rechaza sourcePage que no empiece por /', () => {
    expect(() =>
      businessEventSchema.parse({
        type: 'comparator_used',
        category: 'tornos',
        sourcePage: 'https://evil.example.com/',
      }),
    ).toThrow();
  });

  it('rechaza un type desconocido', () => {
    expect(() =>
      businessEventSchema.parse({ type: 'made_up_event' }),
    ).toThrow();
  });
});
