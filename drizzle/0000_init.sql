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
CREATE TABLE `booking_events` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`type` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`ref` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`tour_id` text NOT NULL,
	`customer_id` text NOT NULL,
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_ref_unique` ON `bookings` (`ref`);--> statement-breakpoint
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
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_code_unique` ON `coupons` (`code`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`whatsapp` text,
	`country` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE TABLE `destinations` (
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
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guides_slug_unique` ON `guides` (`slug`);--> statement-breakpoint
CREATE TABLE `lead_events` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`type` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tours_slug_unique` ON `tours` (`slug`);--> statement-breakpoint
CREATE TABLE `travelers` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`full_name` text NOT NULL,
	`type` text NOT NULL,
	`age` integer,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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