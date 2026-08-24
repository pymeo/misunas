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
      /** Qué calculadora se completó; opcional por compatibilidad con la ya existente (ahorro salón vs. casa). */
      calculator?: 'ahorro-manicura' | 'rentabilidad-impresora';
      campaign?: import('@/application/campaign').CampaignAttribution;
    }
  | { type: 'review_submitted'; productId: string }
  | { type: 'wear_report_submitted'; productId: string }
  | {
      type: 'top_pick_impression';
      productId: string;
      category: string;
      sourcePage: string;
    }
  | { type: 'comparator_used'; category: string; sourcePage: string };

export interface EventRepository {
  record(event: AnalyticsEvent): Promise<void>;
}

export interface EventTracker {
  track(event: AnalyticsEvent): Promise<void>;
}
