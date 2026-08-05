"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { groupTasksByBucket, type DueBucket } from "@/lib/due-date-buckets";

export interface TaskCardData {
  id: string;
  title: string;
  productId: "carbon-comp-fr" | "carbon-comp-sp" | "carbon-comp-it" | "mrh" | "other";
  dueDate: string | null;
  priority: "High" | "Medium" | "Low";
  status: "To Do" | "In Progress" | "Blocked" | "Done";
  type: "my-todo" | "i-owe-them" | "they-owe-me" | "we-follow-together";
  assignee: string; // "Me" or an interlocutors.id
  delegatedTo: string | null; // interlocutors.id or null
  crSourceTitle: string;
  crDate: string;
}

export interface InterlocutorOption {
  id: string;
  name: string;
}

const BUCKET_ORDER: DueBucket[] = ["Overdue", "Today", "This Week", "Upcoming", "TBD"];

const PRIORITY_STYLES: Record<TaskCardData["priority"], string> = {
  High: "bg-rose-50 text-rose-700 border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-slate-50 text-slate-600 border-slate-200",
};

const STATUS_STYLES: Record<TaskCardData["status"], string> = {
  "To Do": "bg-slate-100 text-slate-600 border-slate-200",
  "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Blocked: "bg-rose-50 text-rose-700 border-rose-200",
  Done: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const PRODUCT_LABELS: Record<TaskCardData["productId"], string> = {
  "carbon-comp-fr": "Carbon Comp FR",
  "carbon-comp-sp": "Carbon Comp SP",
  "carbon-comp-it": "Carbon Comp IT",
  mrh: "MRH",
  other: "Other",
};

const TYPE_LABELS: Record<TaskCardData["type"], string> = {
  "my-todo": "My To-Do",
  "i-owe-them": "I Owe Them",
  "they-owe-me": "They Owe Me",
  "we-follow-together": "We Follow Together",
};

const STATUS_OPTIONS: TaskCardData["status"][] = ["To Do", "In Progress", "Blocked", "Done"];

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

export function MyToDoView({
  tasks,
  interlocutors = [],
}: {
  tasks: TaskCardData[];
  interlocutors?: InterlocutorOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [priorityFilter, setPriorityFilter] = useState<"All" | TaskCardData["priority"]>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | TaskCardData["status"]>("All");
  const [search, setSearch] = useState("");
  // Optimistic local overlay so the UI feels instant while the PATCH is in flight.
  const [overrides, setOverrides] = useState<Record<string, Partial<TaskCardData>>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Which task's title is currently being edited inline (only one at a time).
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of interlocutors) map[p.id] = p.name;
    return map;
  }, [interlocutors]);

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

  // Tick-to-mark-started/done: a single checkbox that cycles To Do -> In
  // Progress -> Done, so both "started" and "done" are one click away without
  // needing the full status dropdown.
  const cycleStatus = (task: TaskCardData) => {
    const next: TaskCardData["status"] =
      task.status === "To Do" ? "In Progress" : task.status === "Done" ? "To Do" : "Done";
    applyUpdate(task.id, { status: next }, { status: next });
  };

  const editStatus = (task: TaskCardData, newStatus: TaskCardData["status"]) => {
    applyUpdate(task.id, { status: newStatus }, { status: newStatus });
  };

  const editDueDate = (task: TaskCardData, newDate: string | null) => {
    applyUpdate(task.id, { dueDate: newDate }, { dueDate: newDate });
  };

  const editPriority = (task: TaskCardData, newPriority: TaskCardData["priority"]) => {
    applyUpdate(task.id, { priority: newPriority }, { priority: newPriority });
  };

  const editProduct = (task: TaskCardData, newProductId: TaskCardData["productId"]) => {
    applyUpdate(task.id, { productId: newProductId }, { productId: newProductId });
  };

  const editType = (task: TaskCardData, newType: TaskCardData["type"]) => {
    applyUpdate(task.id, { type: newType }, { type: newType });
  };

  const editAssignee = (task: TaskCardData, newAssignee: string) => {
    // Reassigning away from "Me" will make this task disappear from My To-Do on
    // the next refresh (this page only shows assignee === "Me") — expected,
    // it now belongs on that interlocutor's follow-up list instead.
    applyUpdate(task.id, { assignee: newAssignee }, { assignee: newAssignee });
  };

  const editDelegatedTo = (task: TaskCardData, newDelegate: string | null) => {
    // Delegation is separate from assignee — the task stays here (still "Me"),
    // it just also shows up, greyed, on the delegate's Interlocutor Hub page.
    applyUpdate(task.id, { delegatedTo: newDelegate }, { delegatedTo: newDelegate });
  };

  const startEditingTitle = (task: TaskCardData) => {
    setEditingTitleId(task.id);
    setDraftTitle(task.title);
  };

  const commitTitle = (task: TaskCardData) => {
    const trimmed = draftTitle.trim();
    setEditingTitleId(null);
    if (trimmed && trimmed !== task.title) {
      applyUpdate(task.id, { title: trimmed }, { title: trimmed });
    }
  };

  const filtered = useMemo(() => {
    return effectiveTasks.filter((t) => {
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [effectiveTasks, priorityFilter, statusFilter, search]);

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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none"
          >
            <option value="All">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
                {items.map((task) => {
                  const isDelegated = Boolean(task.delegatedTo);
                  return (
                    <div
                      key={task.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm ${
                        isDelegated ? "border-slate-200 bg-slate-100/70" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-1 min-w-[240px] items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.status === "Done"}
                          onChange={() => cycleStatus(task)}
                          title="Click to cycle To Do → In Progress → Done"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                        />
                        <div className="flex-1">
                          {editingTitleId === task.id ? (
                            <input
                              autoFocus
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              onBlur={() => commitTitle(task)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                                if (e.key === "Escape") setEditingTitleId(null);
                              }}
                              className="w-full rounded border border-indigo-300 px-1.5 py-0.5 text-sm font-medium text-slate-800 focus:outline-none"
                            />
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p
                                onClick={() => startEditingTitle(task)}
                                title="Click to edit"
                                className={`cursor-text text-sm font-medium hover:bg-slate-50 rounded px-1 -mx-1 ${
                                  task.status === "Done"
                                    ? "text-slate-400 line-through"
                                    : isDelegated
                                      ? "text-slate-500"
                                      : "text-slate-800"
                                }`}
                              >
                                {task.title}
                              </p>
                              {isDelegated && (
                                <span className="rounded-full border border-slate-300 bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                  → {nameById[task.delegatedTo!] ?? "delegated"}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="mt-1 text-xs text-slate-400">
                            from <span className="italic">{task.crSourceTitle}</span> ({task.crDate})
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <select
                              value={task.status}
                              onChange={(e) => editStatus(task, e.target.value as TaskCardData["status"])}
                              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <select
                              value={task.productId}
                              onChange={(e) => editProduct(task, e.target.value as TaskCardData["productId"])}
                              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600"
                            >
                              {Object.entries(PRODUCT_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={task.type}
                              onChange={(e) => editType(task, e.target.value as TaskCardData["type"])}
                              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600"
                            >
                              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={task.assignee}
                              onChange={(e) => editAssignee(task, e.target.value)}
                              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600"
                            >
                              <option value="Me">Me</option>
                              {interlocutors.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={task.delegatedTo ?? ""}
                              onChange={(e) => editDelegatedTo(task, e.target.value || null)}
                              title="Delegate this task to someone else while still following it yourself"
                              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-500"
                            >
                              <option value="">Delegate to…</option>
                              {interlocutors.map((i) => (
                                <option key={i.id} value={i.id}>
                                  → {i.name}
                                </option>
                              ))}
                            </select>
                          </div>
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
                  );
                })}
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
