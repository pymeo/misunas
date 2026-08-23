ALTER TABLE `wear_reports` RENAME TO `wear_reports_legacy`;
--> statement-breakpoint
CREATE TABLE `wear_reports` (
  `id` text PRIMARY KEY NOT NULL, `product_id` text NOT NULL,
  `wear_days` integer NOT NULL CHECK (`wear_days` BETWEEN 1 AND 60),
  `nail_type` text CHECK (`nail_type` IN ('normal', 'flexible', 'quebradiza')),
  `water_exposure` text NOT NULL CHECK (`water_exposure` IN ('poca', 'normal', 'mucha')),
  `manual_work` text NOT NULL CHECK (`manual_work` IN ('bajo', 'medio', 'alto')),
  `prep_used` integer NOT NULL CHECK (`prep_used` IN (0, 1)),
  `lamp_used` integer CHECK (`lamp_used` IN (0, 1)),
  `removal_reason` text NOT NULL CHECK (`removal_reason` IN ('despegadas', 'rotas', 'crecimiento', 'cambio', 'otro')),
  `created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `wear_reports` (`id`, `product_id`, `wear_days`, `nail_type`, `water_exposure`, `manual_work`, `prep_used`, `lamp_used`, `removal_reason`, `created_at`)
SELECT `id`, `product_id`, MIN(`wear_days`, 60), `nail_type`,
  CASE `water_exposure` WHEN 'baja' THEN 'poca' WHEN 'alta' THEN 'mucha' ELSE 'normal' END,
  CASE `manual_work` WHEN 1 THEN 'alto' ELSE 'bajo' END, `prep_used`, `lamp_used`,
  CASE `removal_reason` WHEN 'levantamiento' THEN 'despegadas' WHEN 'rotura' THEN 'rotas' WHEN 'desgaste' THEN 'otro' ELSE `removal_reason` END, `created_at`
FROM `wear_reports_legacy`;
--> statement-breakpoint
DROP TABLE `wear_reports_legacy`;
--> statement-breakpoint
CREATE INDEX `wear_reports_product_created_idx` ON `wear_reports` (`product_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `wear_reports_product_days_idx` ON `wear_reports` (`product_id`, `wear_days`);
--> statement-breakpoint
CREATE TABLE `reviews` (
  `id` text PRIMARY KEY NOT NULL, `product_id` text NOT NULL,
  `rating` integer NOT NULL CHECK (`rating` BETWEEN 1 AND 5), `title` text, `body` text NOT NULL,
  `recommend` integer NOT NULL CHECK (`recommend` IN (0, 1)),
  `status` text NOT NULL DEFAULT 'pending' CHECK (`status` IN ('pending', 'approved', 'rejected')),
  `created_at` integer NOT NULL, `approved_at` integer
);
--> statement-breakpoint
CREATE INDEX `reviews_product_status_created_idx` ON `reviews` (`product_id`, `status`, `created_at`);
--> statement-breakpoint
CREATE INDEX `reviews_status_created_idx` ON `reviews` (`status`, `created_at`);
