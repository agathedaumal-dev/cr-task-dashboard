// POST /api/cr/webhook — receives the Granola → Zapier webhook payload.
//
// Per Granola's Zapier webhook docs, the payload includes meeting title,
// creator name/email, attendee list (names + emails), calendar event details,
// and the notes/transcript text. Field names below are best-guess placeholders —
// confirm the exact Zapier payload shape once the Zap is created (send one real
// test event and inspect it) and adjust the destructuring accordingly.
//
// Security TODO before going live: verify a shared-secret header on incoming
// requests via GRANOLA_WEBHOOK_SECRET — this endpoint is otherwise public.

export const maxDuration = 60;

import { NextResponse } from "next/server";
import { parseCr, getConfiguredLlmClient, type Language, type OpenTaskRef } from "@/lib/parse-cr";
import { saveParsedCr } from "@/lib/save-parsed-cr";
import { db } from "@/lib/db";
import { tasks } from "@/db/schema";
import { ne } from "drizzle-orm";

// Fed to the LLM so it can recognize "that's done" / "delegate that to
// Calindé" lines referring to work raised in a prior meeting, not just
// extract brand-new action items from this one.
async function loadOpenTasks(): Promise<OpenTaskRef[]> {
  if (!db) return [];
  const rows = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(ne(tasks.status, "Done"));
  return rows;
}

function detectLanguage(text: string): Language {
  const lower = text.toLowerCase();
  if (/[áéíóúñ¿¡]/.test(lower) || / el | la | de la /.test(lower)) return "es";
  if (/[àâçéèêëîïôùûü]/.test(lower) || / le | la | des /.test(lower)) return "fr";
  return "en";
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (process.env.GRANOLA_WEBHOOK_SECRET && secret !== process.env.GRANOLA_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON" }, { status: 400 });
  }

  const title = (payload.meeting_title as string) ?? (payload.title as string) ?? "Untitled meeting";
  const meetingDate =
    (payload.event_start as string) ?? (payload.created_at as string) ?? new Date().toISOString();
  const attendees = ((payload.attendees as { name?: string; email?: string }[]) ?? []).map(
    (a) => a.name ?? a.email ?? "Unknown"
  );
  const rawText = (payload.notes as string) ?? (payload.transcript as string) ?? "";

  if (!rawText) {
    return NextResponse.json({ error: "no notes/transcript in payload" }, { status: 400 });
  }

  const language = detectLanguage(rawText);
  let llm;
  try {
    llm = getConfiguredLlmClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const openTasks = await loadOpenTasks();

  let parsed;
  try {
    parsed = await parseCr({ rawText, title, meetingDate, attendees, language, openTasks }, llm);
  } catch (e) {
    console.error("CR parsing failed:", e);
    return NextResponse.json({ error: `LLM parsing failed: ${(e as Error).message}` }, { status: 502 });
  }

  try {
    const result = await saveParsedCr({
      title,
      meetingDate,
      attendees,
      language,
      rawText,
      candidates: parsed.tasks,
      completedTaskIds: parsed.completedTaskIds,
      delegatedToCalindeTaskIds: parsed.delegatedToCalindeTaskIds,
      source: "granola-webhook",
    });
    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    console.error("Saving parsed CR failed:", e);
    return NextResponse.json({ error: `Saving to database failed: ${(e as Error).message}` }, { status: 500 });
  }
}
