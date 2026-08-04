"use client";

import { useMemo, useState } from "react";

export interface InterlocutorData {
  id: string;
  name: string;
  role: string;
  whatTheyDo: string;
}

export interface FollowUpTask {
  id: string;
  interlocutorId: string;
  title: string;
  type: "i-owe-them" | "they-owe-me" | "we-follow-together";
  dueDate: string | null;
  status: "To Do" | "In Progress" | "Blocked" | "Done";
  crSourceTitle: string;
  crDate: string;
}

export function InterlocutorHub({
  interlocutors,
  tasks,
}: {
  interlocutors: InterlocutorData[];
  tasks: FollowUpTask[];
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(interlocutors[0]?.id ?? null);

  const filteredList = useMemo(
    () => interlocutors.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [interlocutors, search]
  );

  const selected = interlocutors.find((i) => i.id === selectedId) ?? null;
  const iOweThem = tasks.filter((t) => t.interlocutorId === selectedId && t.type === "i-owe-them");
  const theyOweMe = tasks.filter((t) => t.interlocutorId === selectedId && t.type === "they-owe-me");
  const weFollowTogether = tasks.filter((t) => t.interlocutorId === selectedId && t.type === "we-follow-together");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-72 border-r border-slate-200 bg-white p-4">
        <input
          type="text"
          placeholder="Search interlocutors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-300 focus:outline-none"
        />
        <div className="space-y-1">
          {filteredList.map((person) => (
            <button
              key={person.id}
              onClick={() => setSelectedId(person.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                person.id === selectedId
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="font-medium">{person.name}</div>
              <div className="text-xs text-slate-400">{person.role}</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-8">
        {!selected ? (
          <p className="text-sm text-slate-400">Select an interlocutor.</p>
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-2xl font-semibold text-slate-800">{selected.name}</h1>
              <p className="text-sm text-slate-500">{selected.role}</p>
              <p className="mt-1 text-sm text-slate-400">{selected.whatTheyDo}</p>
            </header>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FollowUpColumn title="What I owe them" accent="border-rose-200 bg-rose-50/40" items={iOweThem} />
                <FollowUpColumn
                  title="What they owe me"
                  accent="border-amber-200 bg-amber-50/40"
                  items={theyOweMe}
                />
              </div>
              <FollowUpColumn
                title="What we follow together"
                accent="border-emerald-200 bg-emerald-50/40"
                items={weFollowTogether}
                compact
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function FollowUpColumn({
  title,
  accent,
  items,
  compact,
}: {
  title: string;
  accent: string;
  items: FollowUpTask[];
  compact?: boolean;
}) {
  return (
    <section className={`rounded-2xl border p-4 ${accent} ${compact ? "py-3" : ""}`}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {title} <span className="text-slate-400">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing pending.</p>
      ) : (
        <div className={compact ? "flex flex-wrap gap-2" : "space-y-2"}>
          {items.map((task) => (
            <div
              key={task.id}
              className={
                compact
                  ? "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  : "rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
              }
            >
              <p className={compact ? "font-medium text-slate-800" : "text-sm font-medium text-slate-800"}>
                {task.title}
              </p>
              {!compact && (
                <p className="text-xs text-slate-400">
                  Due {task.dueDate ?? "TBD"} · from <span className="italic">{task.crSourceTitle}</span> (
                  {task.crDate})
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
