CREATE TABLE "system_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'Info' NOT NULL,
	"event" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_system_events_severity" CHECK ("system_events"."severity" IN ('Info', 'Success', 'Warning', 'Error'))
);
