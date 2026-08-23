export interface WearReport {
  id: string;
  productId: string;
  wearDays: number;
  nailType: 'normal' | 'flexible' | 'quebradiza' | null;
  waterExposure: 'poca' | 'normal' | 'mucha';
  manualWork: 'bajo' | 'medio' | 'alto';
  prepUsed: boolean;
  lampUsed: boolean | null;
  removalReason: 'despegadas' | 'rotas' | 'crecimiento' | 'cambio' | 'otro';
  createdAt: Date;
}
export interface WearReportRepository {
  create(report: WearReport): Promise<void>;
  listWearDays(productId: string): Promise<number[]>;
}
