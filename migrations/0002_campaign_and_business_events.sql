ALTER TABLE `affiliate_click_events` ADD COLUMN `utm_source` text;
--> statement-breakpoint
ALTER TABLE `affiliate_click_events` ADD COLUMN `utm_medium` text;
--> statement-breakpoint
ALTER TABLE `affiliate_click_events` ADD COLUMN `utm_campaign` text;
--> statement-breakpoint
ALTER TABLE `affiliate_click_events` ADD COLUMN `utm_content` text;
--> statement-breakpoint
CREATE TABLE `business_events` (
  `id` text PRIMARY KEY NOT NULL,
  `type` text NOT NULL CHECK (`type` IN ('review_submitted', 'wear_report_submitted', 'calculator_completed')),
  `product_id` text,
  `metadata` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `business_events_type_created_idx` ON `business_events` (`type`, `created_at`);
--> statement-breakpoint
CREATE INDEX `business_events_product_created_idx` ON `business_events` (`product_id`, `created_at`);
