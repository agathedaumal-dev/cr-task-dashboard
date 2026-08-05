// PATCH /api/tasks/[id] — manual override for any task field. Used by the
// checkbox (status), due-date picker, and priority selector across My To-Do,
// Interlocutor Hub, and Product Hub views. Everything the CR parser fills in
// automatically can be corrected here.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_STATUS = ["To Do", "In Progress", "Blocked", "Done"] as const;
const ALLOWED_PRIORITY = ["High", "Medium", "Low"] as const;
const ALLOWED_TYPE = ["my-todo", "i-owe-them", "they-owe-me", "we-follow-together"] as const;
const ALLOWED_PRODUCT = ["carbon-comp-fr", "carbon-comp-sp", "carbon-comp-it", "mrh", "other"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!db) {
    return NextResponse.json({ error: "No database configured" }, { status: 500 });
  }
  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!ALLOWED_STATUS.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!ALLOWED_PRIORITY.includes(body.priority)) {
      return NextResponse.json({ error: "invalid priority" }, { status: 400 });
    }
    updates.priority = body.priority;
  }
  if (body.dueDate !== undefined) {
    updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.type !== undefined) {
    if (!ALLOWED_TYPE.includes(body.type)) {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }
    updates.type = body.type;
  }
  if (body.title !== undefined) {
    updates.title = String(body.title);
  }
  if (body.productId !== undefined) {
    if (!ALLOWED_PRODUCT.includes(body.productId)) {
      return NextResponse.json({ error: "invalid productId" }, { status: 400 });
    }
    updates.productId = body.productId;
  }
  // "Me" or an interlocutors.id, chosen from a dropdown — never free text from
  // the client, so no separate format validation beyond non-empty.
  if (body.assignee !== undefined) {
    const assignee = String(body.assignee).trim();
    if (!assignee) {
      return NextResponse.json({ error: "assignee cannot be empty" }, { status: 400 });
    }
    updates.assignee = assignee;
    updates.interlocutorId = assignee === "Me" ? null : assignee;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }
  updates.updatedAt = new Date();

  const [row] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
  if (!row) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }
  return NextResponse.json({ task: row });
}
