CREATE TABLE "departments" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"school" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
