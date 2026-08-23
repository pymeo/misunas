-- Development-only records. IDs and metadata explicitly identify these rows as samples.
INSERT OR IGNORE INTO recommendation_events (id, result_product_ids, metadata, created_at)
VALUES ('sample-recommendation-event', '["sample-natural-easy"]', '{"fixture":"development-only"}', 0);
