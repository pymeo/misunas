import { describe, expect, it } from 'vitest';
import { calculateAnnualSavings } from '@/application/savings';

describe('calculateAnnualSavings', () => {
  it('calculates and rounds annual costs locally', () => {
    expect(
      calculateAnnualSavings({
        salonPrice: 30,
        frequencyWeeks: 2,
        homeProductCost: 20,
        manicuresPerPack: 2,
      }),
    ).toEqual({
      annualSalonCost: 780,
      annualHomeCost: 260,
      annualSavings: 520,
    });
  });
});
