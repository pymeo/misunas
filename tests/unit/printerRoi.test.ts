import { describe, expect, it } from 'vitest';
import { calculatePrinterRoi } from '@/application/printerRoi';

describe('calculatePrinterRoi', () => {
  it('calcula coste por servicio, margen y amortización con un margen positivo', () => {
    expect(
      calculatePrinterRoi({
        machinePrice: 400,
        cartridgeCost: 20,
        servicesPerCartridge: 100,
        extraChargePerService: 5,
        weeklyClients: 8,
      }),
    ).toEqual({
      costPerService: 0.2,
      marginPerService: 4.8,
      servicesToBreakEven: 84,
      weeksToBreakEven: 11,
    });
  });

  it('devuelve null en los tiempos de amortización cuando el cargo extra no cubre el consumible', () => {
    const result = calculatePrinterRoi({
      machinePrice: 400,
      cartridgeCost: 50,
      servicesPerCartridge: 10,
      extraChargePerService: 3,
      weeklyClients: 5,
    });
    expect(result.costPerService).toBe(5);
    expect(result.marginPerService).toBe(-2);
    expect(result.servicesToBreakEven).toBeNull();
    expect(result.weeksToBreakEven).toBeNull();
  });

  it('devuelve null cuando el margen es exactamente cero (nunca se amortiza)', () => {
    const result = calculatePrinterRoi({
      machinePrice: 400,
      cartridgeCost: 20,
      servicesPerCartridge: 10,
      extraChargePerService: 2,
      weeklyClients: 5,
    });
    expect(result.marginPerService).toBe(0);
    expect(result.servicesToBreakEven).toBeNull();
    expect(result.weeksToBreakEven).toBeNull();
  });

  it('rechaza valores fuera de rango en vez de calcular con datos absurdos', () => {
    expect(() =>
      calculatePrinterRoi({
        machinePrice: -1,
        cartridgeCost: 20,
        servicesPerCartridge: 100,
        extraChargePerService: 5,
        weeklyClients: 8,
      }),
    ).toThrow();
  });
});
