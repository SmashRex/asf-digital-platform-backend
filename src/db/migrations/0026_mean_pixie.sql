CREATE TABLE "executive_offices" (
	"id" varchar(60) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_executive_offices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"office_id" varchar(60) NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_executive_offices" ADD CONSTRAINT "user_executive_offices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_executive_offices" ADD CONSTRAINT "user_executive_offices_office_id_executive_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."executive_offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_executive_offices" ADD CONSTRAINT "user_executive_offices_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_user_executive_office" ON "user_executive_offices" USING btree ("user_id","office_id");--> statement-breakpoint
CREATE INDEX "idx_user_exec_offices_user" ON "user_executive_offices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_exec_offices_office" ON "user_executive_offices" USING btree ("office_id");