import { describe, expect, it } from 'vitest';
import { calculateProductStatistics } from '@/application/statistics';
describe('calculateProductStatistics', () => {
  it('oculta toda precisión con 0 o pocas experiencias', () => {
    expect(calculateProductStatistics([], 5)).toEqual({ sampleSize: 0, sufficientSample: false, averageWearDays: null, medianWearDays: null, distribution: null });
    expect(calculateProductStatistics([11], 5).medianWearDays).toBeNull();
  });
  it('calcula media, mediana y la distribución pública', () => {
    expect(calculateProductStatistics([2, 5, 9, 12, 18], 5)).toEqual({ sampleSize: 5, sufficientSample: true, averageWearDays: 9.2, medianWearDays: 9, distribution: { from1To3: 1, from4To7: 1, from8To10: 1, from11To14: 1, atLeast15: 1 } });
  });
  it('descarta valores fuera de 1 a 60', () => { expect(calculateProductStatistics([0, 1, 60, 61], 2).sampleSize).toBe(2); });
});
