// POST /api/cr/parse — manual-paste ingestion path (v1 fallback while the
// Granola webhook is being wired up, and always available as a manual option).
//
// Body: { title, meetingDate, attendees, language, rawText }

import { NextResponse } from "next/server";
import { parseCr, getConfiguredLlmClient, type Language } from "@/lib/parse-cr";
import { saveParsedCr } from "@/lib/save-parsed-cr";

export async function POST(req: Request) {
  const body = await req.json();
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
  const { tasks: candidates } = await parseCr({ rawText, title, meetingDate, attendees, language }, llm);

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
}
