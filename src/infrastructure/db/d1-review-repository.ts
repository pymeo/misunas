import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { ProductReview, ReviewRepository } from '@/domain/review';
import { reviews } from '@/infrastructure/db/schema';

export class D1ReviewRepository implements ReviewRepository {
  private readonly db;
  constructor(database: D1Database) {
    this.db = drizzle(database);
  }
  async create(review: ProductReview): Promise<void> {
    await this.db.insert(reviews).values(review).run();
  }
  async listApproved(productId: string, limit = 20): Promise<ProductReview[]> {
    return this.db
      .select()
      .from(reviews)
      .where(
        and(eq(reviews.productId, productId), eq(reviews.status, 'approved')),
      )
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .all();
  }
}
