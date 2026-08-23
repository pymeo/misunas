export type AnalyticsEvent =
  | {
      type: 'amazon_click';
      productId: string;
      sourcePage: string;
      component: string;
      position?: number;
    }
  | {
      type: 'recommendation_completed';
      resultProductIds: string[];
      metadata: Record<string, string>;
    }
  | { type: 'calculator_completed'; metadata: Record<string, number> };

export interface EventRepository {
  record(event: AnalyticsEvent): Promise<void>;
}

export interface EventTracker {
  track(event: AnalyticsEvent): Promise<void>;
}
