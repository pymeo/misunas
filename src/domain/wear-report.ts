export interface WearReport {
  id: string;
  productId: string;
  wearDays: number;
  nailType: 'normal' | 'flexible' | 'quebradiza';
  waterExposure: 'baja' | 'media' | 'alta';
  manualWork: boolean;
  prepUsed: boolean;
  lampUsed: boolean;
  removalReason: 'desgaste' | 'levantamiento' | 'rotura' | 'cambio' | 'otro';
  createdAt: Date;
}

export interface WearReportRepository {
  create(report: WearReport): Promise<void>;
  listWearDays(productId: string): Promise<number[]>;
}
