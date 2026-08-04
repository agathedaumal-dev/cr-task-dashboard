export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MyToDoView, type TaskCardData } from "@/components/dashboard/cr-task-dashboard/MyToDoView";
import { MOCK_MY_TODO_TASKS } from "@/lib/mock-cr-data";

export default async function MyToDoPage() {
  let myTasks: TaskCardData[] = MOCK_MY_TODO_TASKS;

  if (db) {
    const rows = await db.select().from(tasks).where(eq(tasks.assignee, "Me"));
    myTasks = rows.map((r) => ({
      id: r.id,
      title: r.title,
      productId: r.productId,
      dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
      priority: r.priority,
      status: r.status,
      crSourceTitle: r.crSourceTitle,
      crDate: r.crDate.toISOString().slice(0, 10),
    }));
  }

  return <MyToDoView tasks={myTasks} />;
}
