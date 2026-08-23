import { drizzle } from 'drizzle-orm/d1';

import type { AnalyticsEvent, EventRepository } from '@/domain/event';
import {
  affiliateClickEvents,
  recommendationEvents,
} from '@/infrastructure/db/schema';

export class D1EventRepository implements EventRepository {
  private readonly db;

  constructor(database: D1Database) {
    this.db = drizzle(database);
  }

  async record(event: AnalyticsEvent): Promise<void> {
    if (event.type === 'amazon_click') {
      await this.db
        .insert(affiliateClickEvents)
        .values({
          id: crypto.randomUUID(),
          productId: event.productId,
          sourcePage: event.sourcePage,
          component: event.component,
          position: event.position,
          createdAt: new Date(),
        })
        .run();
      return;
    }

    if (event.type === 'recommendation_completed') {
      await this.db
        .insert(recommendationEvents)
        .values({
          id: crypto.randomUUID(),
          resultProductIds: event.resultProductIds,
          metadata: event.metadata,
          createdAt: new Date(),
        })
        .run();
    }
  }
}
