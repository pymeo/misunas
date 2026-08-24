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
    const { productId, metadata } = businessEventFields(event);
    await this.db
      .insert(businessEvents)
      .values({
        id: crypto.randomUUID(),
        type: event.type,
        productId,
        metadata,
        createdAt: new Date(),
      })
      .run();
  }
}

type BusinessEvent = Exclude<
  AnalyticsEvent,
  { type: 'amazon_click' } | { type: 'recommendation_completed' }
>;

/** Exhaustivo a propósito: si se añade un tipo de evento nuevo, TS obliga a mapearlo aquí. */
function businessEventFields(event: BusinessEvent): {
  productId: string | null;
  metadata: Record<string, string>;
} {
  switch (event.type) {
    case 'calculator_completed':
      return {
        productId: null,
        metadata: {
          ...campaignToMetadata(event.campaign),
          ...(event.calculator ? { calculator: event.calculator } : {}),
        },
      };
    case 'review_submitted':
    case 'wear_report_submitted':
      return { productId: event.productId, metadata: {} };
    case 'top_pick_impression':
      return {
        productId: event.productId,
        metadata: { category: event.category, sourcePage: event.sourcePage },
      };
    case 'comparator_used':
      return {
        productId: null,
        metadata: { category: event.category, sourcePage: event.sourcePage },
      };
  }
}
