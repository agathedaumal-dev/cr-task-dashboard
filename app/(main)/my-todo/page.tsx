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
    // Temporary: surface the real DB error on the page instead of letting it
    // bubble into Next's opaque "Something went wrong" Server Component
    // error boundary, which hides the message in production builds.
    try {
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
        delegatedTo: r.delegatedTo,
        crSourceTitle: r.crSourceTitle,
        crDate: r.crDate.toISOString().slice(0, 10),
      }));

      const knownInterlocutors = await db.select().from(interlocutors);
      interlocutorOptions = knownInterlocutors.map((i) => ({ id: i.id, name: i.name }));
    } catch (err) {
      return (
        <div className="min-h-screen bg-slate-50 p-8">
          <div className="mx-auto max-w-2xl rounded-xl border border-rose-200 bg-rose-50 p-6">
            <h1 className="mb-2 text-lg font-semibold text-rose-800">My To-Do failed to load</h1>
            <pre className="whitespace-pre-wrap break-words text-sm text-rose-700">
              {err instanceof Error ? `${err.name}: ${err.message}` : String(err)}
            </pre>
          </div>
        </div>
      );
    }
  }

  return <MyToDoView tasks={myTasks} interlocutors={interlocutorOptions} />;
}
