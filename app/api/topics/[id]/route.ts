// DELETE /api/topics/[id] — removes a topic outright, permanently. Same
// pattern as the task delete route: used by a 🗑 button (Product Hub,
// Interlocutor Hub), no soft-delete/undo, UI confirms before calling this.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { topics } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!db) {
    return NextResponse.json({ error: "No database configured" }, { status: 500 });
  }
  const { id } = await params;

  const [row] = await db.delete(topics).where(eq(topics.id, id)).returning();
  if (!row) {
    return NextResponse.json({ error: "topic not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
