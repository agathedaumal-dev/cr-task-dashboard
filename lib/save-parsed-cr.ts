// Shared persistence step for both ingestion paths (manual paste + Granola
// webhook): takes parsed task candidates and a CR's metadata, matches
// assignees against known interlocutors, tags each task's product, and
// writes everything to the DB. Falls back to returning unsaved candidates
// when DATABASE_URL isn't configured yet (db-optional, per template convention).

import { db } from "@/lib/db";
import { meetingCrs, tasks, interlocutors } from "@/db/schema";
import { tagProduct } from "@/lib/product-tagging";
import type { ParsedTaskCandidate, Language } from "@/lib/parse-cr";

export interface SaveParsedCrInput {
  title: string;
  meetingDate: string;
  attendees: string[];
  language: Language;
  rawText: string;
  candidates: ParsedTaskCandidate[];
  source: "manual-paste" | "granola-webhook";
}

export async function saveParsedCr(input: SaveParsedCrInput) {
  const { title, meetingDate, attendees, language, rawText, candidates, source } = input;

  if (!db) {
    const tagged = candidates.map((c) => ({ ...c, product: tagProduct({ crText: rawText }) }));
    return { saved: false as const, candidates: tagged };
  }

  const knownInterlocutors = await db.select().from(interlocutors);

  const [cr] = await db
    .insert(meetingCrs)
    .values({ title, meetingDate: new Date(meetingDate), attendees, language, rawText, source })
    .returning();

  if (!cr) {
    throw new Error("Failed to insert meeting_crs row");
  }

  const inserted = [];
  for (const candidate of candidates) {
    const matchedInterlocutor = knownInterlocutors.find(
      (i) => i.name.toLowerCase() === candidate.assigneeName.toLowerCase()
    );
    const { productId } = tagProduct({
      crText: rawText,
      interlocutor: matchedInterlocutor
        ? {
            id: matchedInterlocutor.id,
            name: matchedInterlocutor.name,
            defaultProductId: matchedInterlocutor.defaultProductId ?? undefined,
          }
        : undefined,
    });

    const [row] = await db
      .insert(tasks)
      .values({
        title: candidate.title,
        assignee: candidate.assigneeName === "Me" ? "Me" : matchedInterlocutor?.id ?? candidate.assigneeName,
        interlocutorId: matchedInterlocutor?.id,
        // TODO: when productId is unresolved, surface a "needs manual tag" flag
        // in the UI instead of silently defaulting to MRH.
        productId: productId ?? "mrh",
        dueDate: candidate.dueDate ? new Date(candidate.dueDate) : null,
        priority: candidate.priority,
        // 'Me' + tied to an interlocutor -> I owe them. 'Me' with no interlocutor
        // context -> a plain personal task. Assigned to the interlocutor -> they owe me.
        // 'we-follow-together' isn't auto-assigned; reclassify manually via PATCH
        // /api/tasks/[id] if a task turns out to be a joint item.
        type:
          candidate.assigneeName === "Me"
            ? matchedInterlocutor
              ? "i-owe-them"
              : "my-todo"
            : "they-owe-me",
        crId: cr.id,
        crSourceTitle: title,
        crDate: new Date(meetingDate),
      })
      .returning();
    inserted.push(row);
  }

  return { saved: true as const, cr, tasks: inserted };
}
