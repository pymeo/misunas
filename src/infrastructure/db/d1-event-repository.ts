import { drizzle } from 'drizzle-orm/d1';
import { campaignToMetadata } from '@/application/campaign';

import type { AnalyticsEvent, EventRepository } from '@/domain/event';
import {
  affiliateClickEvents,
  businessEvents,
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
          utmSource: event.campaign?.utmSource,
          utmMedium: event.campaign?.utmMedium,
          utmCampaign: event.campaign?.utmCampaign,
          utmContent: event.campaign?.utmContent,
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
      return;
    }
    await this.db
      .insert(businessEvents)
      .values({
        id: crypto.randomUUID(),
        type: event.type,
        productId:
          event.type === 'calculator_completed' ? null : event.productId,
        metadata: event.type === 'calculator_completed' ? campaignToMetadata(event.campaign) : {},
        createdAt: new Date(),
      })
      .run();
  }
}
