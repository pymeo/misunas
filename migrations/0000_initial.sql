CREATE TABLE `wear_reports` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `wear_days` integer NOT NULL CHECK (`wear_days` BETWEEN 1 AND 90),
  `nail_type` text NOT NULL CHECK (`nail_type` IN ('normal', 'flexible', 'quebradiza')),
  `water_exposure` text NOT NULL CHECK (`water_exposure` IN ('baja', 'media', 'alta')),
  `manual_work` integer NOT NULL CHECK (`manual_work` IN (0, 1)),
  `prep_used` integer NOT NULL CHECK (`prep_used` IN (0, 1)),
  `lamp_used` integer NOT NULL CHECK (`lamp_used` IN (0, 1)),
  `removal_reason` text NOT NULL CHECK (`removal_reason` IN ('desgaste', 'levantamiento', 'rotura', 'cambio', 'otro')),
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wear_reports_product_created_idx` ON `wear_reports` (`product_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `wear_reports_product_days_idx` ON `wear_reports` (`product_id`, `wear_days`);
--> statement-breakpoint
CREATE TABLE `affiliate_click_events` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `source_page` text NOT NULL,
  `component` text NOT NULL,
  `position` integer,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `affiliate_click_product_created_idx` ON `affiliate_click_events` (`product_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `affiliate_click_source_created_idx` ON `affiliate_click_events` (`source_page`, `created_at`);
--> statement-breakpoint
CREATE TABLE `recommendation_events` (
  `id` text PRIMARY KEY NOT NULL,
  `result_product_ids` text NOT NULL,
  `metadata` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recommendation_created_idx` ON `recommendation_events` (`created_at`);
