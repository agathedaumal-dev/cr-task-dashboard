CREATE TABLE "scratch_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cr_tasks" ADD COLUMN "delegated_to" uuid;--> statement-breakpoint
ALTER TABLE "cr_tasks" ADD CONSTRAINT "cr_tasks_delegated_to_interlocutors_id_fk" FOREIGN KEY ("delegated_to") REFERENCES "public"."interlocutors"("id") ON DELETE no action ON UPDATE no action;