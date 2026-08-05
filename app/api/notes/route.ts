import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scratchNotes } from "@/db/schema";
import { eq } from "drizzle-orm";

// Single global scratchpad — always row id "global". Deliberately separate
// from cr_tasks so jotting a note never touches any task's status/progress.
const NOTE_ID = "global";

export async function GET() {
  if (!db) return NextResponse.json({ content: "" });
  const [row] = await db.select().from(scratchNotes).where(eq(scratchNotes.id, NOTE_ID));
  return NextResponse.json({ content: row?.content ?? "" });
}

export async function PUT(req: Request) {
  if (!db) return NextResponse.json({ error: "No database configured" }, { status: 500 });
  const body = await req.json();
  const content = typeof body.content === "string" ? body.content : "";
  await db
    .insert(scratchNotes)
    .values({ id: NOTE_ID, content, updatedAt: new Date() })
    .onConflictDoUpdate({ target: scratchNotes.id, set: { content, updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
