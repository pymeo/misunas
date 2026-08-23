import { MIN_PUBLIC_SAMPLE_SIZE } from '@/config/site';

export interface ProductStatistics {
  sampleSize: number;
  sufficientSample: boolean;
  averageWearDays: number | null;
  medianWearDays: number | null;
  distribution: {
    from1To3: number;
    from4To7: number;
    from8To10: number;
    from11To14: number;
    atLeast15: number;
  } | null;
}

export function calculateProductStatistics(
  values: number[],
  minimumSampleSize = MIN_PUBLIC_SAMPLE_SIZE,
): ProductStatistics {
  const wearDays = values
    .filter(Number.isFinite)
    .filter((value) => value >= 1 && value <= 60);
  const sampleSize = wearDays.length;
  if (sampleSize < minimumSampleSize)
    return {
      sampleSize,
      sufficientSample: false,
      averageWearDays: null,
      medianWearDays: null,
      distribution: null,
    };
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
      from1To3: wearDays.filter((value) => value <= 3).length,
      from4To7: wearDays.filter((value) => value >= 4 && value <= 7).length,
      from8To10: wearDays.filter((value) => value >= 8 && value <= 10).length,
      from11To14: wearDays.filter((value) => value >= 11 && value <= 14).length,
      atLeast15: wearDays.filter((value) => value >= 15).length,
    },
  };
}
