// POST /api/tasks — create a task manually from the dashboard (My To-Do or
// Interlocutor Hub), now that the standalone /cr-ingestion paste-a-CR page
// is gone. Mirrors the validation in /api/tasks/[id]/route.ts. Always starts
// as status "To Do" — editing status/notes/etc. after creation goes through
// the existing PATCH route and TaskEditModal, same as any other task.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/db/schema";

const ALLOWED_PRIORITY = ["High", "Medium", "Low"] as const;
const ALLOWED_TYPE = ["my-todo", "i-owe-them", "they-owe-me", "we-follow-together"] as const;
const ALLOWED_PRODUCT = ["carbon-comp-fr", "carbon-comp-sp", "carbon-comp-it", "mrh", "other"] as const;

export async function POST(req: Request) {
  if (!db) {
    return NextResponse.json({ error: "No database configured" }, { status: 500 });
  }
  const body = await req.json();

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const assignee = typeof body.assignee === "string" && body.assignee.trim() ? body.assignee.trim() : "Me";

  if (!ALLOWED_PRODUCT.includes(body.productId)) {
    return NextResponse.json({ error: "invalid productId" }, { status: 400 });
  }
  if (!ALLOWED_TYPE.includes(body.type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  const priority = ALLOWED_PRIORITY.includes(body.priority) ? body.priority : "Medium";
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const [row] = await db
    .insert(tasks)
    .values({
      title,
      assignee,
      // Same derivation the PATCH route uses when assignee changes — keeps
      // interlocutorId consistent with assignee without asking for it twice.
      interlocutorId: assignee === "Me" ? null : assignee,
      productId: body.productId,
      dueDate,
      priority,
      status: "To Do",
      type: body.type,
      crSourceTitle: "Manually added",
      crDate: new Date(),
    })
    .returning();

  return NextResponse.json({ task: row });
}
