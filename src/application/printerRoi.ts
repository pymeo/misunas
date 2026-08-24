import { z } from 'zod';

export const printerRoiInputSchema = z.object({
  machinePrice: z.number().positive().max(20_000),
  cartridgeCost: z.number().positive().max(1000),
  servicesPerCartridge: z.number().positive().max(5000),
  extraChargePerService: z.number().nonnegative().max(500),
  weeklyClients: z.number().positive().max(500),
});

export type PrinterRoiInput = z.infer<typeof printerRoiInputSchema>;

export interface PrinterRoiResult {
  costPerService: number;
  marginPerService: number;
  /** `null` cuando el margen no es positivo: con estos datos nunca se amortiza. */
  servicesToBreakEven: number | null;
  weeksToBreakEven: number | null;
}

/**
 * Cálculo puro y determinista, sin cifras de mercado asumidas: todos los
 * valores vienen de lo que la usuaria introduce (Fase 12). Si el cargo
 * extra por nail art no cubre el coste del consumible, `marginPerService`
 * sale negativo o cero y ambos "tiempo para amortizar" quedan en `null` en
 * vez de un número negativo o infinito sin sentido.
 */
export function calculatePrinterRoi(input: PrinterRoiInput): PrinterRoiResult {
  const valid = printerRoiInputSchema.parse(input);
  const costPerService = roundMoney(
    valid.cartridgeCost / valid.servicesPerCartridge,
  );
  const marginPerService = roundMoney(
    valid.extraChargePerService - costPerService,
  );
  const servicesToBreakEven =
    marginPerService > 0
      ? Math.ceil(valid.machinePrice / marginPerService)
      : null;
  const weeksToBreakEven =
    servicesToBreakEven !== null
      ? Math.ceil(servicesToBreakEven / valid.weeklyClients)
      : null;
  return {
    costPerService,
    marginPerService,
    servicesToBreakEven,
    weeksToBreakEven,
  };
}

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;
