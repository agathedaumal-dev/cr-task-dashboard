export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { interlocutors, tasks, taskInterlocutors } from "@/db/schema";
import { isNotNull, or, inArray } from "drizzle-orm";
import {
  InterlocutorHub,
  type InterlocutorData,
  type FollowUpTask,
  type DelegatedInTask,
  type TaggedInTask,
} from "@/components/dashboard/cr-task-dashboard/InterlocutorHub";
import { MOCK_INTERLOCUTORS, MOCK_FOLLOWUP_TASKS } from "@/lib/mock-cr-data";

export default async function InterlocutorsPage() {
  let people: InterlocutorData[] = MOCK_INTERLOCUTORS;
  let followUps: FollowUpTask[] = MOCK_FOLLOWUP_TASKS;
  let delegatedIn: DelegatedInTask[] = [];
  let taggedIn: TaggedInTask[] = [];

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

    // "Also involves" tags, grouped once by task id — used below for both
    // followUps/delegatedIn (so their TaskEditModal shows the right checked
    // boxes) and for the standalone "Also involves you" section further down.
    const tagRows = await db.select().from(taskInterlocutors);
    const tagsByTask: Record<string, string[]> = {};
    for (const r of tagRows) {
      (tagsByTask[r.taskId] ??= []).push(r.interlocutorId);
    }

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
        notes: t.notes,
        additionalInterlocutorIds: tagsByTask[t.id] ?? [],
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
        notes: t.notes,
        additionalInterlocutorIds: tagsByTask[t.id] ?? [],
        crSourceTitle: t.crSourceTitle,
        crDate: t.crDate.toISOString().slice(0, 10),
      }));

    // "Also involves you" — tasks tagged with extra people beyond their
    // primary owner. Can be ANY task (including plain "my-todo" ones), so
    // fetch those rows separately rather than assuming they're in taskRows.
    const taggedTaskIds = [...new Set(tagRows.map((r) => r.taskId))];
    const taggedTaskRows =
      taggedTaskIds.length > 0 ? await db.select().from(tasks).where(inArray(tasks.id, taggedTaskIds)) : [];
    const taskById: Record<string, (typeof taggedTaskRows)[number]> = {};
    for (const t of taggedTaskRows) taskById[t.id] = t;

    taggedIn = tagRows
      .map((r) => {
        const t = taskById[r.taskId];
        if (!t) return null;
        return {
          id: t.id,
          taggedInterlocutorId: r.interlocutorId,
          ownerLabel: t.assignee === "Me" ? "Agathe" : nameById[t.assignee] ?? t.assignee,
          title: t.title,
          productId: t.productId,
          type: t.type,
          assignee: t.assignee,
          priority: t.priority,
          dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
          status: t.status,
          notes: t.notes,
          crSourceTitle: t.crSourceTitle,
          crDate: t.crDate.toISOString().slice(0, 10),
        };
      })
      .filter((t): t is TaggedInTask => t !== null);
  }

  return (
    <InterlocutorHub
      interlocutors={people}
      tasks={followUps}
      delegatedTasks={delegatedIn}
      taggedTasks={taggedIn}
    />
  );
}
