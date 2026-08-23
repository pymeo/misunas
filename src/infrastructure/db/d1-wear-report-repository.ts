import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import type { WearReport, WearReportRepository } from '@/domain/wear-report';
import { wearReports } from '@/infrastructure/db/schema';

export class D1WearReportRepository implements WearReportRepository {
  private readonly db;

  constructor(database: D1Database) {
    this.db = drizzle(database);
  }

  async create(report: WearReport): Promise<void> {
    await this.db.insert(wearReports).values(report).run();
  }

  async listWearDays(productId: string): Promise<number[]> {
    const rows = await this.db
      .select({ wearDays: wearReports.wearDays })
      .from(wearReports)
      .where(eq(wearReports.productId, productId))
      .all();
    return rows.map(({ wearDays }) => wearDays);
  }
}
