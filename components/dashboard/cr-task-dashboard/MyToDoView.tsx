"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { groupTasksByBucket, type DueBucket } from "@/lib/due-date-buckets";

export interface TaskCardData {
  id: string;
  title: string;
  productId: "carbon-comp-fr" | "carbon-comp-sp" | "carbon-comp-it" | "mrh";
  dueDate: string | null;
  priority: "High" | "Medium" | "Low";
  status: "To Do" | "In Progress" | "Blocked" | "Done";
  crSourceTitle: string;
  crDate: string;
}

const BUCKET_ORDER: DueBucket[] = ["Overdue", "Today", "This Week", "Upcoming", "TBD"];

const PRIORITY_STYLES: Record<TaskCardData["priority"], string> = {
  High: "bg-rose-50 text-rose-700 border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-slate-50 text-slate-600 border-slate-200",
};

const PRODUCT_LABELS: Record<TaskCardData["productId"], string> = {
  "carbon-comp-fr": "Carbon Comp FR",
  "carbon-comp-sp": "Carbon Comp SP",
  "carbon-comp-it": "Carbon Comp IT",
  mrh: "MRH",
};

const BUCKET_STYLES: Record<DueBucket, string> = {
  Overdue: "text-rose-600",
  Today: "text-indigo-600",
  "This Week": "text-emerald-600",
  Upcoming: "text-slate-500",
  TBD: "text-slate-400",
};

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

export function MyToDoView({ tasks }: { tasks: TaskCardData[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [priorityFilter, setPriorityFilter] = useState<"All" | TaskCardData["priority"]>("All");
  const [search, setSearch] = useState("");
  // Optimistic local overlay so the UI feels instant while the PATCH is in flight.
  const [overrides, setOverrides] = useState<Record<string, Partial<TaskCardData>>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveTasks = useMemo(
    () => tasks.map((t) => ({ ...t, ...overrides[t.id] })),
    [tasks, overrides]
  );

  const applyUpdate = (id: string, patch: Partial<TaskCardData>, body: Record<string, unknown>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setErrorMsg(null);
    patchTask(id, body)
      .then(() => startTransition(() => router.refresh()))
      .catch((e) => setErrorMsg(e.message));
  };

  const toggleDone = (task: TaskCardData) => {
    const newStatus = task.status === "Done" ? "To Do" : "Done";
    applyUpdate(task.id, { status: newStatus }, { status: newStatus });
  };

  const editDueDate = (task: TaskCardData, newDate: string | null) => {
    applyUpdate(task.id, { dueDate: newDate }, { dueDate: newDate });
  };

  const editPriority = (task: TaskCardData, newPriority: TaskCardData["priority"]) => {
    applyUpdate(task.id, { priority: newPriority }, { priority: newPriority });
  };

  const filtered = useMemo(() => {
    return effectiveTasks.filter((t) => {
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [effectiveTasks, priorityFilter, search]);

  const grouped = useMemo(() => groupTasksByBucket(filtered), [filtered]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">My To-Do</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none"
          />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none"
          >
            <option value="All">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </header>

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="space-y-8">
        {BUCKET_ORDER.map((bucket) => {
          const items = grouped[bucket];
          if (items.length === 0) return null;
          return (
            <section key={bucket}>
              <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${BUCKET_STYLES[bucket]}`}>
                {bucket} <span className="text-slate-400">({items.length})</span>
              </h2>
              <div className="space-y-2">
                {items.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.status === "Done"}
                        onChange={() => toggleDone(task)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                      />
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            task.status === "Done" ? "text-slate-400 line-through" : "text-slate-800"
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {PRODUCT_LABELS[task.productId]} · from{" "}
                          <span className="italic">{task.crSourceTitle}</span> ({task.crDate})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={task.dueDate ?? ""}
                        onChange={(e) => editDueDate(task, e.target.value || null)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500"
                      />
                      <select
                        value={task.priority}
                        onChange={(e) => editPriority(task, e.target.value as TaskCardData["priority"])}
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400">Nothing here yet — paste a CR to get started.</p>
        )}
      </div>
    </div>
  );
}
