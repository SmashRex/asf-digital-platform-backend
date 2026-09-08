CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"department" varchar(255) NOT NULL,
	"academic_level" varchar(50) NOT NULL,
	"phone_number" varchar(50),
	"subgroup" varchar(100),
	"account_status" varchar(50) DEFAULT 'Active' NOT NULL,
	"membership_status" varchar(50) DEFAULT 'Active Student' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_account_status" CHECK ("users"."account_status" IN ('Active', 'Suspended', 'Deactivated')),
	CONSTRAINT "chk_membership_status" CHECK ("users"."membership_status" IN ('Active Student', 'Alumni', 'Visiting')),
	CONSTRAINT "chk_academic_level" CHECK ("users"."academic_level" IN ('100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'Postgraduate', 'Alumni'))
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" varchar(50) NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_link_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_consumed" boolean DEFAULT false NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "magic_link_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token_hash" varchar(64) NOT NULL,
	"device_info" text,
	"ip_address" varchar(45),
	"expires_at" timestamp with time zone NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_session_token_hash_unique" UNIQUE("session_token_hash")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email_lower" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "idx_users_account_status" ON "users" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "idx_users_academic_level" ON "users" USING btree ("academic_level");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_user_role" ON "user_roles" USING btree ("user_id","role_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_user" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_role" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_magic_link_lookup" ON "magic_link_tokens" USING btree ("token_hash","is_consumed","expires_at");--> statement-breakpoint
CREATE INDEX "idx_magic_link_user" ON "magic_link_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_lookup" ON "user_sessions" USING btree ("session_token_hash","is_revoked","expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions" USING btree ("user_id");