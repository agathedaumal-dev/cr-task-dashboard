// POST /api/cr/parse — manual-paste ingestion path (v1 fallback while the
// Granola webhook is being wired up, and always available as a manual option).
//
// Body: { title, meetingDate, attendees, language, rawText }

export const maxDuration = 60; // LLM parsing of a long CR can take a while; default (10s) was too short.

import { NextResponse } from "next/server";
import { parseCr, getConfiguredLlmClient, type Language } from "@/lib/parse-cr";
import { saveParsedCr } from "@/lib/save-parsed-cr";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON" }, { status: 400 });
  }

  const { title, meetingDate, attendees, language, rawText } = body as {
    title: string;
    meetingDate: string;
    attendees: string[];
    language: Language;
    rawText: string;
  };

  if (!rawText || !title || !meetingDate) {
    return NextResponse.json({ error: "title, meetingDate, and rawText are required" }, { status: 400 });
  }

  let llm;
  try {
    llm = getConfiguredLlmClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  let candidates;
  try {
    const parsed = await parseCr({ rawText, title, meetingDate, attendees, language }, llm);
    candidates = parsed.tasks;
  } catch (e) {
    console.error("CR parsing failed:", e);
    return NextResponse.json(
      { error: `LLM parsing failed: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  try {
    const result = await saveParsedCr({
      title,
      meetingDate,
      attendees,
      language,
      rawText,
      candidates,
      source: "manual-paste",
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("Saving parsed CR failed:", e);
    return NextResponse.json(
      { error: `Saving to database failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
