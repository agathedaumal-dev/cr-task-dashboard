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

import { NextResponse } from "next/server";
import { parseCr, getConfiguredLlmClient, type Language } from "@/lib/parse-cr";
import { saveParsedCr } from "@/lib/save-parsed-cr";

function detectLanguage(text: string): Language {
  // Placeholder heuristic — replace with a real detector once real Granola
  // payloads are in hand (or have Gemini report the detected language back).
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

  const payload = await req.json();

  const title: string = payload.meeting_title ?? payload.title ?? "Untitled meeting";
  const meetingDate: string = payload.event_start ?? payload.created_at ?? new Date().toISOString();
  const attendees: string[] = (payload.attendees ?? []).map(
    (a: { name?: string; email?: string }) => a.name ?? a.email ?? "Unknown"
  );
  const rawText: string = payload.notes ?? payload.transcript ?? "";

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
  const { tasks: candidates } = await parseCr({ rawText, title, meetingDate, attendees, language }, llm);

  const result = await saveParsedCr({
    title,
    meetingDate,
    attendees,
    language,
    rawText,
    candidates,
    source: "granola-webhook",
  });

  return NextResponse.json({ received: true, ...result });
}
