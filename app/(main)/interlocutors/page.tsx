export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { interlocutors, tasks } from "@/db/schema";
import { isNotNull, or } from "drizzle-orm";
import {
  InterlocutorHub,
  type InterlocutorData,
  type FollowUpTask,
  type DelegatedInTask,
} from "@/components/dashboard/cr-task-dashboard/InterlocutorHub";
import { MOCK_INTERLOCUTORS, MOCK_FOLLOWUP_TASKS } from "@/lib/mock-cr-data";

export default async function InterlocutorsPage() {
  let people: InterlocutorData[] = MOCK_INTERLOCUTORS;
  let followUps: FollowUpTask[] = MOCK_FOLLOWUP_TASKS;
  let delegatedIn: DelegatedInTask[] = [];

  if (db) {
    const peopleRows = await db.select().from(interlocutors);
    people = peopleRows.map((p) => ({ id: p.id, name: p.name, role: p.role, whatTheyDo: p.whatTheyDo, team: p.team }));
    const nameById: Record<string, string> = {};
    for (const p of peopleRows) nameById[p.id] = p.name;

    // Follow-up tasks (i-owe-them / they-owe-me / we-follow-together) plus any
    // task that's been delegated need pulling — a task can qualify for either
    // reason, so OR the two conditions rather than requiring interlocutorId.
    const taskRows = await db
      .select()
      .from(tasks)
      .where(or(isNotNull(tasks.interlocutorId), isNotNull(tasks.delegatedTo)));

    followUps = taskRows
      .filter(
        (t) =>
          t.interlocutorId &&
          (t.type === "i-owe-them" || t.type === "they-owe-me" || t.type === "we-follow-together")
      )
      .map((t) => ({
        id: t.id,
        interlocutorId: t.interlocutorId!,
        title: t.title,
        type: t.type as "i-owe-them" | "they-owe-me" | "we-follow-together",
        productId: t.productId,
        priority: t.priority,
        assignee: t.assignee,
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
        status: t.status,
        delegatedTo: t.delegatedTo,
        crSourceTitle: t.crSourceTitle,
        crDate: t.crDate.toISOString().slice(0, 10),
      }));

    delegatedIn = taskRows
      .filter((t) => t.delegatedTo)
      .map((t) => ({
        id: t.id,
        delegateeId: t.delegatedTo!,
        ownerLabel: t.assignee === "Me" ? "Agathe" : nameById[t.assignee] ?? t.assignee,
        title: t.title,
        productId: t.productId,
        type: t.type,
        assignee: t.assignee,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
        status: t.status,
        crSourceTitle: t.crSourceTitle,
        crDate: t.crDate.toISOString().slice(0, 10),
      }));
  }

  return <InterlocutorHub interlocutors={people} tasks={followUps} delegatedTasks={delegatedIn} />;
}
