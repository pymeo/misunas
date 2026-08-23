import { describe, expect, it } from 'vitest';
import { calculateProductStatistics } from '@/application/statistics';

describe('calculateProductStatistics', () => {
  it('withholds precision below the minimum sample size', () => {
    expect(calculateProductStatistics([5, 10, 15], 4)).toEqual({
      sampleSize: 3,
      sufficientSample: false,
      averageWearDays: null,
      medianWearDays: null,
      distribution: null,
    });
  });

  it('calculates average, median and buckets with enough data', () => {
    expect(calculateProductStatistics([5, 7, 14, 21], 4)).toEqual({
      sampleSize: 4,
      sufficientSample: true,
      averageWearDays: 11.8,
      medianWearDays: 10.5,
      distribution: { lessThan7: 1, from7To13: 1, from14To20: 1, atLeast21: 1 },
    });
  });
});
