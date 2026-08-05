"use client";

import { useEffect, useRef, useState } from "react";

// Small floating global scratchpad, available on every dashboard page (it's
// mounted once in the shared layout). Deliberately not wired to any task —
// it only ever touches /api/notes, never /api/tasks — so it's a safe place
// to jot something down without accidentally changing progress on a task.
export function NotesWidget() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((d) => setContent(d.content ?? ""))
      .catch(() => {});
  }, []);

  const onChange = (value: string) => {
    setContent(value);
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      })
        .then((r) => {
          if (!r.ok) throw new Error();
          setStatus("saved");
        })
        .catch(() => setStatus("error"));
    }, 500);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-slate-800 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-slate-700"
      >
        📝 Notes
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex w-80 flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <span className="text-sm font-semibold text-slate-700">Scratchpad</span>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Jot anything down — this never touches task status/progress…"
        className="h-40 w-full resize-none rounded-b-2xl p-3 text-sm text-slate-700 focus:outline-none"
      />
      <div className="border-t border-slate-100 px-4 py-1.5 text-right text-xs text-slate-400">
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved"}
        {status === "error" && <span className="text-rose-500">Failed to save</span>}
      </div>
    </div>
  );
}
