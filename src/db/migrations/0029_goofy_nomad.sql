CREATE TABLE "governance_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_type" varchar(50) NOT NULL,
	"requested_by" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'Pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_governance_request_type" CHECK ("governance_requests"."request_type" IN ('office_assignment', 'dashboard_grant', 'capability_grant')),
	CONSTRAINT "chk_governance_request_status" CHECK ("governance_requests"."status" IN ('Pending', 'Approved', 'Rejected'))
);
--> statement-breakpoint
ALTER TABLE "governance_requests" ADD CONSTRAINT "governance_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governance_requests" ADD CONSTRAINT "governance_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_governance_requests_status" ON "governance_requests" USING btree ("status");