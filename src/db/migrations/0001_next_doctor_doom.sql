CREATE TABLE "academic_sessions" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_session_dates" CHECK ("academic_sessions"."end_date" >= "academic_sessions"."start_date")
);
--> statement-breakpoint
CREATE TABLE "user_academic_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"academic_session_id" varchar(20) NOT NULL,
	"academic_level" varchar(50) NOT NULL,
	"progression_status" varchar(50) DEFAULT 'Promoted' NOT NULL,
	"is_override" boolean DEFAULT false NOT NULL,
	"override_reason" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_academic_history" ADD CONSTRAINT "user_academic_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_academic_history" ADD CONSTRAINT "user_academic_history_academic_session_id_academic_sessions_id_fk" FOREIGN KEY ("academic_session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_academic_history" ADD CONSTRAINT "user_academic_history_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_active_academic_session" ON "academic_sessions" USING btree ("is_active") WHERE "academic_sessions"."is_active" = TRUE;--> statement-breakpoint
CREATE INDEX "idx_academic_history_user" ON "user_academic_history" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_user_session_history" ON "user_academic_history" USING btree ("user_id","academic_session_id");