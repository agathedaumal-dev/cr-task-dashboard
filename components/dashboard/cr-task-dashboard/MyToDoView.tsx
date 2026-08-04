"use client";

import { useMemo, useState } from "react";
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

export function MyToDoView({
  tasks,
  onToggleDone,
  onEditDueDate,
}: {
  tasks: TaskCardData[];
  onToggleDone?: (id: string) => void;
  onEditDueDate?: (id: string, newDate: string | null) => void;
}) {
  const [priorityFilter, setPriorityFilter] = useState<"All" | TaskCardData["priority"]>("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, priorityFilter, search]);

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
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.status === "Done"}
                        onChange={() => onToggleDone?.(task.id)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{task.title}</p>
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
                        placeholder="TBD"
                        onChange={(e) => onEditDueDate?.(task.id, e.target.value || null)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500"
                      />
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
