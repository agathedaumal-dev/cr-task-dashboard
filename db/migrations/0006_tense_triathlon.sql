CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"product_id" "product_id" NOT NULL,
	"interlocutor_id" uuid,
	"topic_date" timestamp NOT NULL,
	"cr_source_title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_interlocutor_id_interlocutors_id_fk" FOREIGN KEY ("interlocutor_id") REFERENCES "public"."interlocutors"("id") ON DELETE no action ON UPDATE no action;