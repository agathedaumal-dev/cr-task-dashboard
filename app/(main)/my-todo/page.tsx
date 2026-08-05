export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { tasks, interlocutors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MyToDoView, type TaskCardData } from "@/components/dashboard/cr-task-dashboard/MyToDoView";
import { MOCK_MY_TODO_TASKS } from "@/lib/mock-cr-data";

export default async function MyToDoPage() {
  let myTasks: TaskCardData[] = MOCK_MY_TODO_TASKS;
  let interlocutorOptions: { id: string; name: string }[] = [];

  if (db) {
    const rows = await db.select().from(tasks).where(eq(tasks.assignee, "Me"));
    myTasks = rows.map((r) => ({
      id: r.id,
      title: r.title,
      productId: r.productId,
      dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
      priority: r.priority,
      status: r.status,
      type: r.type,
      assignee: r.assignee,
      crSourceTitle: r.crSourceTitle,
      crDate: r.crDate.toISOString().slice(0, 10),
    }));

    const knownInterlocutors = await db.select().from(interlocutors);
    interlocutorOptions = knownInterlocutors.map((i) => ({ id: i.id, name: i.name }));
  }

  return <MyToDoView tasks={myTasks} interlocutors={interlocutorOptions} />;
}
