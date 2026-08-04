CREATE TYPE "public"."cr_source" AS ENUM('manual-paste', 'granola-webhook');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'fr', 'es');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('High', 'Medium', 'Low');--> statement-breakpoint
CREATE TYPE "public"."product_id" AS ENUM('carbon-comp-fr', 'carbon-comp-sp', 'carbon-comp-it', 'mrh');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('To Do', 'In Progress', 'Blocked', 'Done');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('my-todo', 'i-owe-them', 'they-owe-me', 'we-follow-together');--> statement-breakpoint
CREATE TABLE "interlocutors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"what_they_do" text DEFAULT '' NOT NULL,
	"default_product_id" "product_id",
	"is_confirmed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_crs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"meeting_date" timestamp NOT NULL,
	"attendees" text[] DEFAULT '{}' NOT NULL,
	"language" "language" NOT NULL,
	"raw_text" text NOT NULL,
	"source" "cr_source" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cr_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"assignee" text NOT NULL,
	"interlocutor_id" uuid,
	"product_id" "product_id" NOT NULL,
	"due_date" timestamp,
	"priority" "priority" DEFAULT 'Medium' NOT NULL,
	"status" "status" DEFAULT 'To Do' NOT NULL,
	"type" "task_type" DEFAULT 'my-todo' NOT NULL,
	"cr_id" uuid,
	"cr_source_title" text NOT NULL,
	"cr_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cr_tasks" ADD CONSTRAINT "cr_tasks_interlocutor_id_interlocutors_id_fk" FOREIGN KEY ("interlocutor_id") REFERENCES "public"."interlocutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cr_tasks" ADD CONSTRAINT "cr_tasks_cr_id_meeting_crs_id_fk" FOREIGN KEY ("cr_id") REFERENCES "public"."meeting_crs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;