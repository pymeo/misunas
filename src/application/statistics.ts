import { MINIMUM_STATISTICS_SAMPLE_SIZE } from '@/config/site';

export interface ProductStatistics {
  sampleSize: number;
  sufficientSample: boolean;
  averageWearDays: number | null;
  medianWearDays: number | null;
  distribution: {
    lessThan7: number;
    from7To13: number;
    from14To20: number;
    atLeast21: number;
  } | null;
}

export function calculateProductStatistics(
  values: number[],
  minimumSampleSize = MINIMUM_STATISTICS_SAMPLE_SIZE,
): ProductStatistics {
  const wearDays = values
    .filter(Number.isFinite)
    .filter((value) => value >= 1 && value <= 90);
  const sampleSize = wearDays.length;
  if (sampleSize < minimumSampleSize) {
    return {
      sampleSize,
      sufficientSample: false,
      averageWearDays: null,
      medianWearDays: null,
      distribution: null,
    };
  }

  const sorted = [...wearDays].sort((a, b) => a - b);
  const middle = Math.floor(sampleSize / 2);
  const median =
    sampleSize % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? 0);

  return {
    sampleSize,
    sufficientSample: true,
    averageWearDays:
      Math.round(
        (wearDays.reduce((sum, value) => sum + value, 0) / sampleSize) * 10,
      ) / 10,
    medianWearDays: median,
    distribution: {
      lessThan7: wearDays.filter((value) => value < 7).length,
      from7To13: wearDays.filter((value) => value >= 7 && value <= 13).length,
      from14To20: wearDays.filter((value) => value >= 14 && value <= 20).length,
      atLeast21: wearDays.filter((value) => value >= 21).length,
    },
  };
}
