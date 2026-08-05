"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AddInterlocutorForm } from "./AddInterlocutorForm";

export interface InterlocutorData {
  id: string;
  name: string;
  role: string;
  whatTheyDo: string;
  // Optional shared-page grouping — people with the same team show up as one
  // sidebar entry and share one page; tasks stay attributed to the real
  // individual and get that person's name prefixed on the card.
  team?: string | null;
}

export type FollowUpType = "i-owe-them" | "they-owe-me" | "we-follow-together";

export interface FollowUpTask {
  id: string;
  interlocutorId: string;
  title: string;
  type: FollowUpType;
  dueDate: string | null;
  status: "To Do" | "In Progress" | "Blocked" | "Done";
  crSourceTitle: string;
  crDate: string;
}

// A sidebar entry is either a single ungrouped person or a team of people who
// share one page.
interface SidebarEntry {
  key: string;
  label: string;
  subtitle: string;
  memberIds: string[];
}

async function patchTask(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "unknown error" }));
    throw new Error(error ?? "Failed to update task");
  }
}

// Drag-and-drop payload — a custom MIME type so we don't collide with drags
// originating from elsewhere on the page (e.g. text selection).
const DRAG_MIME = "application/x-cr-task-id";

export function InterlocutorHub({
  interlocutors,
  tasks,
}: {
  interlocutors: InterlocutorData[];
  tasks: FollowUpTask[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Optimistic local overlay, same pattern as My To-Do, so a card visibly jumps
  // to its new column immediately instead of waiting for a full page refresh.
  const [overrides, setOverrides] = useState<Record<string, FollowUpType>>({});
  const [dragOverColumn, setDragOverColumn] = useState<FollowUpType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of interlocutors) map[p.id] = p.name;
    return map;
  }, [interlocutors]);

  // Group interlocutors into sidebar entries: one per team, one per ungrouped person.
  const sidebarEntries = useMemo<SidebarEntry[]>(() => {
    const teams = new Map<string, InterlocutorData[]>();
    const solo: InterlocutorData[] = [];
    for (const p of interlocutors) {
      if (p.team) {
        const list = teams.get(p.team) ?? [];
        list.push(p);
        teams.set(p.team, list);
      } else {
        solo.push(p);
      }
    }
    const teamEntries: SidebarEntry[] = [...teams.entries()].map(([team, members]) => ({
      key: `team:${team}`,
      label: team,
      subtitle: members.map((m) => m.name).join(", "),
      memberIds: members.map((m) => m.id),
    }));
    const soloEntries: SidebarEntry[] = solo.map((p) => ({
      key: `person:${p.id}`,
      label: p.name,
      subtitle: p.role,
      memberIds: [p.id],
    }));
    return [...teamEntries, ...soloEntries].sort((a, b) => a.label.localeCompare(b.label));
  }, [interlocutors]);

  const effectiveSelectedKey = selectedKey ?? sidebarEntries[0]?.key ?? null;

  const effectiveTasks = useMemo(
    () =>
      tasks.map((t) => {
        const override = overrides[t.id];
        return override ? { ...t, type: override } : t;
      }),
    [tasks, overrides]
  );

  const moveTask = (taskId: string, newType: FollowUpType) => {
    const task = effectiveTasks.find((t) => t.id === taskId);
    if (!task || task.type === newType) return;
    setOverrides((prev) => ({ ...prev, [taskId]: newType }));
    setErrorMsg(null);
    patchTask(taskId, { type: newType })
      .then(() => startTransition(() => router.refresh()))
      .catch((e) => {
        setErrorMsg(e.message);
        // Roll back the optimistic move if the PATCH actually failed.
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      });
  };

  const filteredEntries = useMemo(
    () => sidebarEntries.filter((e) => e.label.toLowerCase().includes(search.toLowerCase())),
    [sidebarEntries, search]
  );

  const selectedEntry = sidebarEntries.find((e) => e.key === effectiveSelectedKey) ?? null;
  const memberIdSet = new Set(selectedEntry?.memberIds ?? []);
  const isTeam = (selectedEntry?.memberIds.length ?? 0) > 1;

  // Prefix a task's title with the owner's name only when viewing a team page
  // (an ungrouped person's own page doesn't need their name repeated).
  const withOwnerPrefix = (t: FollowUpTask) =>
    isTeam ? { ...t, title: `[${nameById[t.interlocutorId] ?? "?"}] ${t.title}` } : t;

  const iOweThem = effectiveTasks
    .filter((t) => memberIdSet.has(t.interlocutorId) && t.type === "i-owe-them")
    .map(withOwnerPrefix);
  const theyOweMe = effectiveTasks
    .filter((t) => memberIdSet.has(t.interlocutorId) && t.type === "they-owe-me")
    .map(withOwnerPrefix);
  const weFollowTogether = effectiveTasks
    .filter((t) => memberIdSet.has(t.interlocutorId) && t.type === "we-follow-together")
    .map(withOwnerPrefix);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-72 border-r border-slate-200 bg-white p-4">
        <AddInterlocutorForm />
        <input
          type="text"
          placeholder="Search interlocutors or teams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-300 focus:outline-none"
        />
        <div className="space-y-1">
          {filteredEntries.map((entry) => (
            <button
              key={entry.key}
              onClick={() => setSelectedKey(entry.key)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                entry.key === effectiveSelectedKey
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="font-medium">{entry.label}</div>
              <div className="truncate text-xs text-slate-400">{entry.subtitle}</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-8">
        {!selectedEntry ? (
          <p className="text-sm text-slate-400">Select an interlocutor or team.</p>
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-2xl font-semibold text-slate-800">{selectedEntry.label}</h1>
              <p className="text-sm text-slate-500">
                {isTeam ? `Shared page — ${selectedEntry.subtitle}` : selectedEntry.subtitle}
              </p>
            </header>

            {errorMsg && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMsg}
              </div>
            )}

            <p className="mb-3 text-xs text-slate-400">
              Drag a task card and drop it into a different box to move it — no need to open anything.
            </p>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FollowUpColumn
                  title="What I owe them"
                  type="i-owe-them"
                  accent="border-rose-200 bg-rose-50/40"
                  items={iOweThem}
                  isDragOver={dragOverColumn === "i-owe-them"}
                  onDragOverColumn={setDragOverColumn}
                  onDropTask={moveTask}
                />
                <FollowUpColumn
                  title="What they owe me"
                  type="they-owe-me"
                  accent="border-amber-200 bg-amber-50/40"
                  items={theyOweMe}
                  isDragOver={dragOverColumn === "they-owe-me"}
                  onDragOverColumn={setDragOverColumn}
                  onDropTask={moveTask}
                />
              </div>
              <FollowUpColumn
                title="What we follow together"
                type="we-follow-together"
                accent="border-emerald-200 bg-emerald-50/40"
                items={weFollowTogether}
                isDragOver={dragOverColumn === "we-follow-together"}
                onDragOverColumn={setDragOverColumn}
                onDropTask={moveTask}
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
  type,
  accent,
  items,
  compact,
  isDragOver,
  onDragOverColumn,
  onDropTask,
}: {
  title: string;
  type: FollowUpType;
  accent: string;
  items: FollowUpTask[];
  compact?: boolean;
  isDragOver: boolean;
  onDragOverColumn: (type: FollowUpType | null) => void;
  onDropTask: (taskId: string, newType: FollowUpType) => void;
}) {
  return (
    <section
      onDragOver={(e) => {
        // Required to allow a drop — browsers block drops by default.
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          onDragOverColumn(type);
        }
      }}
      onDragLeave={() => onDragOverColumn(null)}
      onDrop={(e) => {
        e.preventDefault();
        onDragOverColumn(null);
        const taskId = e.dataTransfer.getData(DRAG_MIME);
        if (taskId) onDropTask(taskId, type);
      }}
      className={`rounded-2xl border p-4 transition ${accent} ${compact ? "py-3" : ""} ${
        isDragOver ? "ring-2 ring-indigo-400 ring-offset-2" : ""
      }`}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {title} <span className="text-slate-400">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{isDragOver ? "Drop here" : "Nothing pending."}</p>
      ) : (
        <div className={compact ? "flex flex-wrap gap-2" : "space-y-2"}>
          {items.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_MIME, task.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              className={`cursor-grab active:cursor-grabbing ${
                compact
                  ? "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  : "rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
              }`}
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
