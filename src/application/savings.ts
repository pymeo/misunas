import { z } from 'zod';

export const savingsInputSchema = z.object({
  salonPrice: z.number().positive().max(1000),
  frequencyWeeks: z.number().positive().max(52),
  homeProductCost: z.number().nonnegative().max(1000),
  manicuresPerPack: z.number().positive().max(100),
});

export type SavingsInput = z.infer<typeof savingsInputSchema>;

export interface SavingsResult {
  annualSalonCost: number;
  annualHomeCost: number;
  annualSavings: number;
}

export function calculateAnnualSavings(input: SavingsInput): SavingsResult {
  const valid = savingsInputSchema.parse(input);
  const manicuresPerYear = 52 / valid.frequencyWeeks;
  const annualSalonCost = manicuresPerYear * valid.salonPrice;
  const annualHomeCost =
    (manicuresPerYear / valid.manicuresPerPack) * valid.homeProductCost;
  return {
    annualSalonCost: roundMoney(annualSalonCost),
    annualHomeCost: roundMoney(annualHomeCost),
    annualSavings: roundMoney(annualSalonCost - annualHomeCost),
  };
}

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;
