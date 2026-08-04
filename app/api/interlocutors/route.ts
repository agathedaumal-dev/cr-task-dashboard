import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interlocutors } from "@/db/schema";

export async function GET() {
  if (!db) return NextResponse.json({ interlocutors: [] });
  const rows = await db.select().from(interlocutors);
  return NextResponse.json({ interlocutors: rows });
}

export async function POST(req: Request) {
  if (!db) {
    return NextResponse.json({ error: "No database configured" }, { status: 500 });
  }
  const body = await req.json();
  const { name, role, whatTheyDo, defaultProductId } = body as {
    name: string;
    role?: string;
    whatTheyDo?: string;
    defaultProductId?: "carbon-comp-fr" | "carbon-comp-sp" | "carbon-comp-it" | "mrh" | null;
  };
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const [row] = await db
    .insert(interlocutors)
    .values({
      name: name.trim(),
      role: role?.trim() ?? "",
      whatTheyDo: whatTheyDo?.trim() ?? "",
      defaultProductId: defaultProductId ?? null,
      isConfirmed: true,
    })
    .returning();
  return NextResponse.json({ interlocutor: row });
}
