CREATE TABLE "task_interlocutors" (
	"task_id" uuid NOT NULL,
	"interlocutor_id" uuid NOT NULL,
	CONSTRAINT "task_interlocutors_task_id_interlocutor_id_pk" PRIMARY KEY("task_id","interlocutor_id")
);
--> statement-breakpoint
ALTER TABLE "task_interlocutors" ADD CONSTRAINT "task_interlocutors_task_id_cr_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."cr_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_interlocutors" ADD CONSTRAINT "task_interlocutors_interlocutor_id_interlocutors_id_fk" FOREIGN KEY ("interlocutor_id") REFERENCES "public"."interlocutors"("id") ON DELETE cascade ON UPDATE no action;