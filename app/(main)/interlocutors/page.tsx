import { db } from "@/lib/db";
import { interlocutors, tasks } from "@/db/schema";
import { isNotNull } from "drizzle-orm";
import { InterlocutorHub,
  type InterlocutorData,
  type FollowUpTask,
} from "@/components/dashboard/cr-task-dashboard/InterlocutorHub";
import { MOCK_INTERLOCUTORS, MOCK_FOLLOWUP_TASKS } from "@/lib/mock-cr-data";

export default async function InterlocutorsPage() {
  let people: InterlocutorData[] = MOCK_INTERLOCUTORS;
  let followUps: FollowUpTask[] = MOCK_FOLLOWUP_TASKS;

  if (db) {
    const peopleRows = await db.select().from(interlocutors);
    people = peopleRows.map((p) => ({ id: p.id, name: p.name, role: p.role, whatTheyDo: p.whatTheyDo }));

    const taskRows = await db.select().from(tasks).where(isNotNull(tasks.interlocutorId));
    followUps = taskRows
      .filter((t) => t.type === "i-owe-them" || t.type === "we-follow-together")
      .map((t) => ({
        id: t.id,
        interlocutorId: t.interlocutorId!,
        title: t.title,
        type: t.type as "i-owe-them" | "we-follow-together",
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
        status: t.status,
        crSourceTitle: t.crSourceTitle,
        crDate: t.crDate.toISOString().slice(0, 10),
      }));
  }

  return <InterlocutorHub interlocutors={people} tasks={followUps} />;
}
