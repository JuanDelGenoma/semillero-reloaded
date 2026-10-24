CREATE TABLE "careers" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"slot" integer NOT NULL,
	"club_id" text NOT NULL,
	"manager_name" text NOT NULL,
	"season" integer NOT NULL,
	"week" integer NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "careers_user_slot" ON "careers" ("user_id","slot");