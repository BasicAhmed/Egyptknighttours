CREATE TABLE `addons` (
	`id` text PRIMARY KEY NOT NULL,
	`tour_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price` real NOT NULL,
	`unit` text DEFAULT 'PER_BOOKING' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `addons_tour_idx` ON `addons` (`tour_id`);--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`session_id` text,
	`path` text,
	`tour_slug` text,
	`props` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_name_idx` ON `analytics_events` (`name`,`created_at`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `booking_events` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`type` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `booking_events_booking_idx` ON `booking_events` (`booking_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`ref` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`tour_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`guest_name` text,
	`travel_date` text NOT NULL,
	`adults` integer NOT NULL,
	`children` integer DEFAULT 0 NOT NULL,
	`infants` integer DEFAULT 0 NOT NULL,
	`is_private` integer DEFAULT false NOT NULL,
	`hotel` text,
	`pickup_location` text,
	`special_requests` text,
	`dietary` text,
	`accessibility` text,
	`addons_json` text DEFAULT '[]' NOT NULL,
	`subtotal` real NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`total` real NOT NULL,
	`deposit` real DEFAULT 0 NOT NULL,
	`pay_mode` text DEFAULT 'DEPOSIT' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`coupon_id` text,
	`source` text,
	`title_override` text,
	`preferred_language` text,
	`guide_id` text,
	`driver` text,
	`vehicle` text,
	`flight_arrival` text,
	`flight_departure` text,
	`room_type` text,
	`pickup_time` text,
	`occasion` text,
	`emergency_contact` text,
	`visa_status` text,
	`guide_notes` text,
	`cost_total` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_ref_unique` ON `bookings` (`ref`);--> statement-breakpoint
CREATE INDEX `bookings_customer_idx` ON `bookings` (`customer_id`);--> statement-breakpoint
CREATE INDEX `bookings_tour_idx` ON `bookings` (`tour_id`);--> statement-breakpoint
CREATE INDEX `bookings_status_idx` ON `bookings` (`status`);--> statement-breakpoint
CREATE INDEX `bookings_travel_idx` ON `bookings` (`travel_date`);--> statement-breakpoint
CREATE INDEX `bookings_created_idx` ON `bookings` (`created_at`);--> statement-breakpoint
CREATE TABLE `corporate_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`amount` real NOT NULL,
	`method` text DEFAULT 'MANUAL' NOT NULL,
	`status` text DEFAULT 'PAID' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `corporate_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `corporate_payments_request_idx` ON `corporate_payments` (`request_id`);--> statement-breakpoint
CREATE TABLE `corporate_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`ref` text NOT NULL,
	`company_name` text NOT NULL,
	`company_contact` text DEFAULT '' NOT NULL,
	`company_email` text DEFAULT '' NOT NULL,
	`company_phone` text DEFAULT '' NOT NULL,
	`customer_name` text DEFAULT '' NOT NULL,
	`customer_contact` text DEFAULT '' NOT NULL,
	`customer_count` integer,
	`service_date` text,
	`location` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`requirements` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`pricing_mode` text DEFAULT 'ITEMIZED' NOT NULL,
	`service_percent` real,
	`created_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corporate_requests_ref_unique` ON `corporate_requests` (`ref`);--> statement-breakpoint
CREATE INDEX `corporate_requests_status_idx` ON `corporate_requests` (`status`);--> statement-breakpoint
CREATE TABLE `corporate_services` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`type` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`date` text,
	`time` text,
	`location` text DEFAULT '' NOT NULL,
	`people` integer,
	`supplier` text DEFAULT '' NOT NULL,
	`cost` real DEFAULT 0 NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `corporate_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `corporate_services_request_idx` ON `corporate_services` (`request_id`);--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`min_subtotal` real DEFAULT 0 NOT NULL,
	`tour_id` text,
	`expires_at` integer,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`first_booking_only` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`kind` text DEFAULT 'STANDARD' NOT NULL,
	`owner_customer_id` text,
	FOREIGN KEY (`owner_customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_code_unique` ON `coupons` (`code`);--> statement-breakpoint
CREATE TABLE `customer_rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`amount` real NOT NULL,
	`booking_id` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customer_rewards_customer_idx` ON `customer_rewards` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`whatsapp` text,
	`country` text,
	`nationality` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE TABLE `destinations` (
	`image_url` text,
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`tagline` text NOT NULL,
	`overview` text NOT NULL,
	`best_time` text NOT NULL,
	`how_to_get` text NOT NULL,
	`where_to_stay` text NOT NULL,
	`tips` text NOT NULL,
	`recommended_days` text NOT NULL,
	`seo_title` text NOT NULL,
	`seo_description` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `destinations_slug_unique` ON `destinations` (`slug`);--> statement-breakpoint
CREATE TABLE `document_events` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`type` text NOT NULL,
	`note` text,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_events_doc_idx` ON `document_events` (`document_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`number` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`booking_id` text,
	`itinerary_id` text,
	`status` text DEFAULT 'GENERATED' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`amount` real,
	`data` text NOT NULL,
	`created_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`sent_at` integer,
	`sent_to` text,
	`sent_via` text,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `documents_booking_idx` ON `documents` (`booking_id`);--> statement-breakpoint
CREATE INDEX `documents_itinerary_idx` ON `documents` (`itinerary_id`);--> statement-breakpoint
CREATE TABLE `follow_ups` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`template_key` text NOT NULL,
	`channel` text DEFAULT 'EMAIL' NOT NULL,
	`due_at` integer NOT NULL,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `follow_ups_lead_idx` ON `follow_ups` (`lead_id`);--> statement-breakpoint
CREATE INDEX `follow_ups_due_idx` ON `follow_ups` (`status`,`due_at`);--> statement-breakpoint
CREATE TABLE `guides` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`cluster` text NOT NULL,
	`summary` text NOT NULL,
	`body` text NOT NULL,
	`destination_slug` text,
	`seo_title` text NOT NULL,
	`seo_description` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`faqs` text DEFAULT '[]' NOT NULL,
	`related` text DEFAULT '' NOT NULL,
	`is_pillar` integer DEFAULT false NOT NULL,
	`keywords` text DEFAULT '' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guides_slug_unique` ON `guides` (`slug`);--> statement-breakpoint
CREATE INDEX `guides_status_idx` ON `guides` (`status`,`cluster`);--> statement-breakpoint
CREATE TABLE `itineraries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`is_template` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`booking_id` text,
	`source_template_id` text,
	`tour_id` text,
	`content` text NOT NULL,
	`created_by_id` text,
	`cost_price` real,
	`margin_percent` real,
	`intent` text DEFAULT 'pdf' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `itineraries_template_idx` ON `itineraries` (`is_template`);--> statement-breakpoint
CREATE INDEX `itineraries_booking_idx` ON `itineraries` (`booking_id`);--> statement-breakpoint
CREATE TABLE `lead_events` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`type` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lead_events_lead_idx` ON `lead_events` (`lead_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`whatsapp` text,
	`country` text,
	`travel_dates` text,
	`travelers` integer,
	`interests` text,
	`budget` text,
	`message` text,
	`kind` text DEFAULT 'INQUIRY' NOT NULL,
	`source` text,
	`status` text DEFAULT 'NEW' NOT NULL,
	`tours_viewed` text,
	`notes` text,
	`consent_marketing` integer DEFAULT false NOT NULL,
	`assigned_to_id` text,
	`customer_id` text,
	`last_contact_at` integer,
	`next_follow_up_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `leads_created_idx` ON `leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`data` blob NOT NULL,
	`uploaded_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_created_idx` ON `media` (`created_at`);--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`booking_id` text,
	`corporate_request_id` text,
	`success` integer NOT NULL,
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notification_log_created_idx` ON `notification_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'BANK' NOT NULL,
	`label` text NOT NULL,
	`currency` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`bank_name` text DEFAULT '' NOT NULL,
	`account_name` text DEFAULT '' NOT NULL,
	`account_number` text DEFAULT '' NOT NULL,
	`iban` text DEFAULT '' NOT NULL,
	`swift` text DEFAULT '' NOT NULL,
	`branch` text DEFAULT '' NOT NULL,
	`bank_address` text DEFAULT '' NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`payment_url` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`provider` text DEFAULT 'MANUAL' NOT NULL,
	`kind` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`provider_ref` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_booking_idx` ON `payments` (`booking_id`);--> statement-breakpoint
CREATE TABLE `post_trip_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`platforms` text DEFAULT '[]' NOT NULL,
	`coupon_id` text,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_trip_reviews_booking_id_unique` ON `post_trip_reviews` (`booking_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `redirects` (
	`id` text PRIMARY KEY NOT NULL,
	`from_path` text NOT NULL,
	`to_path` text NOT NULL,
	`status` integer DEFAULT 301 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `redirects_from_path_unique` ON `redirects` (`from_path`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`tour_id` text NOT NULL,
	`author_name` text NOT NULL,
	`country` text,
	`rating` integer NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`trip_date` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reviews_tour_idx` ON `reviews` (`tour_id`,`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`rating` integer DEFAULT 5 NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`source` text DEFAULT 'Tripadvisor' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`review_date` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `testimonials_active_idx` ON `testimonials` (`active`,`sort_order`);--> statement-breakpoint
CREATE TABLE `tour_guides` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`languages` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tours` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`short_description` text NOT NULL,
	`long_description` text NOT NULL,
	`destination_id` text NOT NULL,
	`category` text NOT NULL,
	`audience` text DEFAULT 'ALL' NOT NULL,
	`duration_hours` integer DEFAULT 8 NOT NULL,
	`duration_days` integer DEFAULT 1 NOT NULL,
	`activity_level` text DEFAULT 'EASY' NOT NULL,
	`pricing_model` text DEFAULT 'PER_PERSON' NOT NULL,
	`price` real NOT NULL,
	`discount_price` real,
	`child_percent` integer DEFAULT 50 NOT NULL,
	`private_surcharge` real DEFAULT 0 NOT NULL,
	`is_private_available` integer DEFAULT true NOT NULL,
	`is_group_available` integer DEFAULT true NOT NULL,
	`max_travelers` integer DEFAULT 12 NOT NULL,
	`highlights` text DEFAULT '[]' NOT NULL,
	`itinerary` text DEFAULT '[]' NOT NULL,
	`included` text DEFAULT '[]' NOT NULL,
	`excluded` text DEFAULT '[]' NOT NULL,
	`pickup_info` text DEFAULT '' NOT NULL,
	`meeting_point` text DEFAULT '' NOT NULL,
	`what_to_bring` text DEFAULT '' NOT NULL,
	`cancellation_policy` text DEFAULT '' NOT NULL,
	`faqs` text DEFAULT '[]' NOT NULL,
	`image_url` text,
	`seo_title` text DEFAULT '' NOT NULL,
	`seo_description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`popularity` integer DEFAULT 0 NOT NULL,
	`price_mode` text DEFAULT 'MANUAL' NOT NULL,
	`cost_price` real,
	`margin_percent` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tours_slug_unique` ON `tours` (`slug`);--> statement-breakpoint
CREATE INDEX `tours_status_idx` ON `tours` (`status`);--> statement-breakpoint
CREATE INDEX `tours_destination_idx` ON `tours` (`destination_id`);--> statement-breakpoint
CREATE TABLE `traveler_files` (
	`id` text PRIMARY KEY NOT NULL,
	`traveler_id` text NOT NULL,
	`booking_id` text NOT NULL,
	`kind` text DEFAULT 'PASSPORT' NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`data` blob NOT NULL,
	`uploaded_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`traveler_id`) REFERENCES `travelers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `traveler_files_booking_idx` ON `traveler_files` (`booking_id`);--> statement-breakpoint
CREATE INDEX `traveler_files_traveler_idx` ON `traveler_files` (`traveler_id`);--> statement-breakpoint
CREATE TABLE `travelers` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`full_name` text NOT NULL,
	`type` text NOT NULL,
	`age` integer,
	`nationality` text,
	`dob` text,
	`passport_number` text,
	`passport_expiry` text,
	`notes` text,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `travelers_booking_idx` ON `travelers` (`booking_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'SALES' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);