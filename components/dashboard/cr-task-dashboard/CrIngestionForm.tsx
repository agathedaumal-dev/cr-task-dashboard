"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ParsedTaskResult {
  id: string;
  title: string;
  assignee: string;
  priority: string;
  dueDate: string | null;
  productId: string;
  type: string;
}

export function CrIngestionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendees, setAttendees] = useState("");
  const [language, setLanguage] = useState<"en" | "fr" | "es">("en");
  const [rawText, setRawText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ saved: boolean; tasks?: ParsedTaskResult[] } | null>(null);

  const submit = async () => {
    if (!title.trim() || !rawText.trim()) {
      setError("Title and meeting notes text are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/cr/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          meetingDate,
          attendees: attendees
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          language,
          rawText,
        }),
      });
      const rawBody = await res.text();
      let data: { saved?: boolean; tasks?: ParsedTaskResult[]; error?: string };
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        throw new Error(
          `Server returned a non-JSON response (HTTP ${res.status}). This usually means the ` +
            `request timed out (long CRs can take a while to parse) or the function crashed. Try again, ` +
            `or try a shorter excerpt first.`
        );
      }
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to parse CR (HTTP ${res.status})`);
      }
      setResult({ saved: !!data.saved, tasks: data.tasks });
      if (data.saved) {
        setTitle("");
        setAttendees("");
        setRawText("");
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Meeting title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Point hebdo MRH - Groupe Habitat"
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Meeting date</label>
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Attendees (comma-separated, exact names)
          </label>
          <input
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="Julien Marchand, Fatima Zahra"
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "fr" | "es")}
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Meeting notes (paste Granola export)</label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={12}
          placeholder="Paste the raw meeting notes text here…"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      {result?.saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Created {result.tasks?.length ?? 0} task(s). Check{" "}
          <a href="/my-todo" className="underline">
            My To-Do
          </a>{" "}
          or{" "}
          <a href="/interlocutors" className="underline">
            Interlocutors
          </a>
          .
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Parsing…" : "Parse & save"}
      </button>
    </div>
  );
}
