"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskEditModal, type EditableTask, type InterlocutorOption } from "./TaskEditModal";

export type ProductId = "carbon-comp-fr" | "carbon-comp-sp" | "carbon-comp-it" | "mrh" | "other";

export interface ProductTask {
  id: string;
  title: string;
  assignee: "Me" | string; // "Me" or interlocutors.id
  assigneeName: string; // resolved display name
  type: "my-todo" | "i-owe-them" | "they-owe-me" | "we-follow-together";
  status: "To Do" | "In Progress" | "Blocked" | "Done";
  dueDate: string | null;
  priority: "High" | "Medium" | "Low";
  delegatedTo: string | null;
  notes: string | null;
  crSourceTitle: string;
  crDate: string;
}

const PRODUCT_META: Record<ProductId, { label: string; flag: string }> = {
  "carbon-comp-fr": { label: "Carbon Comp — France", flag: "🇫🇷" },
  "carbon-comp-sp": { label: "Carbon Comp — Spain", flag: "🇪🇸" },
  "carbon-comp-it": { label: "Carbon Comp — Italy", flag: "🇮🇹" },
  mrh: { label: "MRH", flag: "🏠" },
  other: { label: "Other", flag: "📦" },
};

const STATUS_STYLES: Record<ProductTask["status"], string> = {
  "To Do": "bg-slate-100 text-slate-600",
  "In Progress": "bg-indigo-100 text-indigo-700",
  Blocked: "bg-rose-100 text-rose-700",
  Done: "bg-emerald-100 text-emerald-700",
};

const STATUS_OPTIONS: (ProductTask["status"] | "All" | "AllButDone")[] = ["All", "AllButDone", "To Do", "In Progress", "Blocked", "Done"];

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

export function ProductHub({
  productId,
  myTasks,
  interlocutorTasks,
  interlocutors,
}: {
  productId: ProductId;
  myTasks: ProductTask[];
  interlocutorTasks: ProductTask[];
  interlocutors: InterlocutorOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const meta = PRODUCT_META[productId];
  const [statusFilter, setStatusFilter] = useState<ProductTask["status"] | "All" | "AllButDone">("All");
  const [overrides, setOverrides] = useState<Record<string, Partial<ProductTask>>>({});
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const allTasks = useMemo(
    () => [...myTasks, ...interlocutorTasks].map((t) => ({ ...t, ...overrides[t.id] })),
    [myTasks, interlocutorTasks, overrides]
  );

  const applyFilter = (list: ProductTask[]) => {
    if (statusFilter === "All") return list;
    if (statusFilter === "AllButDone") return list.filter((t) => t.status !== "Done");
    return list.filter((t) => t.status === statusFilter);
  };

  const filteredMine = applyFilter(allTasks.filter((t) => t.assignee === "Me"));
  const filteredTheirs = applyFilter(allTasks.filter((t) => t.assignee !== "Me"));

  const openTask = allTasks.find((t) => t.id === openTaskId) ?? null;
  const editableTask: EditableTask | null = openTask
    ? {
        id: openTask.id,
        title: openTask.title,
        productId,
        type: openTask.type,
        assignee: openTask.assignee,
        priority: openTask.priority,
        status: openTask.status,
        dueDate: openTask.dueDate,
        delegatedTo: openTask.delegatedTo,
        notes: openTask.notes,
        crSourceTitle: openTask.crSourceTitle,
        crDate: openTask.crDate,
      }
    : null;

  const onSaved = (updated: Partial<EditableTask>) => {
    if (!openTaskId) return;
    setOverrides((prev) => ({ ...prev, [openTaskId]: { ...prev[openTaskId], ...updated } as Partial<ProductTask> }));
    startTransition(() => router.refresh());
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">
          {meta.flag} {meta.label}
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All statuses" : s === "AllButDone" ? "All but Done" : s}
            </option>
          ))}
        </select>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <TaskColumn title="My tasks" tasks={filteredMine} onOpen={setOpenTaskId} />
        <TaskColumn title="Interlocutors' tasks" tasks={filteredTheirs} showAssignee onOpen={setOpenTaskId} />
      </div>

      {editableTask && (
        <TaskEditModal
          task={editableTask}
          interlocutors={interlocutors}
          onClose={() => setOpenTaskId(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
  showAssignee,
  onOpen,
}: {
  title: string;
  tasks: ProductTask[];
  showAssignee?: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title} <span className="text-slate-400">({tasks.length})</span>
      </h2>
      <div className="space-y-2">
        {tasks.map((task) => {
          const isDelegated = Boolean(task.delegatedTo);
          return (
            <div
              key={task.id}
              onClick={() => onOpen(task.id)}
              className={`cursor-pointer rounded-xl border px-3 py-2 transition hover:border-indigo-200 hover:shadow-sm ${
                isDelegated ? "border-slate-200 bg-slate-100/70" : "border-slate-100 bg-slate-50/60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium ${isDelegated ? "text-slate-500" : "text-slate-800"}`}>
                  {task.title}
                </p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
                  {task.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {showAssignee ? `${task.assigneeName} · ` : ""}Due {task.dueDate ?? "TBD"} · {task.priority} · from{" "}
                <span className="italic">{task.crSourceTitle}</span> ({task.crDate})
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {isDelegated && (
                  <span className="inline-block rounded-full border border-slate-300 bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    delegated
                  </span>
                )}
                {task.notes && (
                  <span title="Has notes" className="text-xs">
                    📝
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && <p className="text-sm text-slate-400">Nothing here yet.</p>}
      </div>
    </section>
  );
}
