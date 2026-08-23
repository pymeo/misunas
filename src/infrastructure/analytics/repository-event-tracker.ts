import type {
  AnalyticsEvent,
  EventRepository,
  EventTracker,
} from '@/domain/event';

export class RepositoryEventTracker implements EventTracker {
  constructor(private readonly repository: EventRepository) {}

  async track(event: AnalyticsEvent): Promise<void> {
    await this.repository.record(event);
  }
}
