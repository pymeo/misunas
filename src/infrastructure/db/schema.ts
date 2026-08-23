import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const wearReports = sqliteTable(
  'wear_reports',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    wearDays: integer('wear_days').notNull(),
    nailType: text('nail_type', { enum: ['normal', 'flexible', 'quebradiza'] }),
    waterExposure: text('water_exposure', {
      enum: ['poca', 'normal', 'mucha'],
    }).notNull(),
    manualWork: text('manual_work', { enum: ['bajo', 'medio', 'alto'] }).notNull(),
    prepUsed: integer('prep_used', { mode: 'boolean' }).notNull(),
    lampUsed: integer('lamp_used', { mode: 'boolean' }),
    removalReason: text('removal_reason', {
      enum: ['despegadas', 'rotas', 'crecimiento', 'cambio', 'otro'],
    }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('wear_reports_product_created_idx').on(
      table.productId,
      table.createdAt,
    ),
    index('wear_reports_product_days_idx').on(table.productId, table.wearDays),
  ],
);

export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    rating: integer('rating').notNull(),
    title: text('title'),
    body: text('body').notNull(),
    recommend: integer('recommend', { mode: 'boolean' }).notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    approvedAt: integer('approved_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('reviews_product_status_created_idx').on(table.productId, table.status, table.createdAt),
    index('reviews_status_created_idx').on(table.status, table.createdAt),
  ],
);

export const affiliateClickEvents = sqliteTable(
  'affiliate_click_events',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    sourcePage: text('source_page').notNull(),
    component: text('component').notNull(),
    position: integer('position'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('affiliate_click_product_created_idx').on(
      table.productId,
      table.createdAt,
    ),
    index('affiliate_click_source_created_idx').on(
      table.sourcePage,
      table.createdAt,
    ),
  ],
);

export const recommendationEvents = sqliteTable(
  'recommendation_events',
  {
    id: text('id').primaryKey(),
    resultProductIds: text('result_product_ids', { mode: 'json' })
      .$type<string[]>()
      .notNull(),
    metadata: text('metadata', { mode: 'json' })
      .$type<Record<string, string>>()
      .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('recommendation_created_idx').on(table.createdAt)],
);
