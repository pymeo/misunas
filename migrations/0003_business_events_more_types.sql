CREATE TABLE `__new_business_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL CHECK (`type` IN ('review_submitted', 'wear_report_submitted', 'calculator_completed', 'top_pick_impression', 'comparator_used')),
	`product_id` text,
	`metadata` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_business_events` SELECT * FROM `business_events`;
--> statement-breakpoint
DROP TABLE `business_events`;
--> statement-breakpoint
ALTER TABLE `__new_business_events` RENAME TO `business_events`;
--> statement-breakpoint
CREATE INDEX `business_events_type_created_idx` ON `business_events` (`type`, `created_at`);
--> statement-breakpoint
CREATE INDEX `business_events_product_created_idx` ON `business_events` (`product_id`, `created_at`);
