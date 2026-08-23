export type AnalyticsEvent =
  | {
      type: 'amazon_click';
      productId: string;
      sourcePage: string;
      component: string;
      position?: number;
      campaign?: import('@/application/campaign').CampaignAttribution;
    }
  | {
      type: 'recommendation_completed';
      resultProductIds: string[];
      metadata: Record<string, string>;
    }
  | {
      type: 'calculator_completed';
      campaign?: import('@/application/campaign').CampaignAttribution;
    }
  | { type: 'review_submitted'; productId: string }
  | { type: 'wear_report_submitted'; productId: string };

export interface EventRepository {
  record(event: AnalyticsEvent): Promise<void>;
}

export interface EventTracker {
  track(event: AnalyticsEvent): Promise<void>;
}
