CREATE TABLE `profiles` (
	`id` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` text,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`)
);
