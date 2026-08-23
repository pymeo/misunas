import { PRODUCTS } from '@/data/products';
import { RepositoryEventTracker } from '@/infrastructure/analytics/repository-event-tracker';
import { D1EventRepository } from '@/infrastructure/db/d1-event-repository';
import { D1ReviewRepository } from '@/infrastructure/db/d1-review-repository';
import { D1WearReportRepository } from '@/infrastructure/db/d1-wear-report-repository';
import { MemoryRateLimiter } from '@/infrastructure/rate-limit/rate-limiter';
import { StaticProductRepository } from '@/infrastructure/repositories/static-product-repository';

export const rateLimiter = new MemoryRateLimiter(15, 60_000);

export function getProductRepository() {
  return new StaticProductRepository(PRODUCTS);
}

export function getD1Dependencies(database: D1Database) {
  const events = new D1EventRepository(database);
  return {
    wearReports: new D1WearReportRepository(database),
    reviews: new D1ReviewRepository(database),
    tracker: new RepositoryEventTracker(events),
  };
}
