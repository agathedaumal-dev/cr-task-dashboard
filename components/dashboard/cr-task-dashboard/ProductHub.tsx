"use client";

export type ProductId = "carbon-comp-fr" | "carbon-comp-sp" | "carbon-comp-it" | "mrh" | "other";

export interface ProductTask {
  id: string;
  title: string;
  assignee: "Me" | string; // "Me" or interlocutor name
  status: "To Do" | "In Progress" | "Blocked" | "Done";
  dueDate: string | null;
  priority: "High" | "Medium" | "Low";
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

export function ProductHub({
  productId,
  myTasks,
  interlocutorTasks,
}: {
  productId: ProductId;
  myTasks: ProductTask[];
  interlocutorTasks: ProductTask[];
}) {
  const meta = PRODUCT_META[productId];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          {meta.flag} {meta.label}
        </h1>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <TaskColumn title="My tasks" tasks={myTasks} />
        <TaskColumn title="Interlocutors' tasks" tasks={interlocutorTasks} showAssignee />
      </div>
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
  showAssignee,
}: {
  title: string;
  tasks: ProductTask[];
  showAssignee?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title} <span className="text-slate-400">({tasks.length})</span>
      </h2>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">{task.title}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
                {task.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {showAssignee ? `${task.assignee} · ` : ""}Due {task.dueDate ?? "TBD"} · {task.priority} · from{" "}
              <span className="italic">{task.crSourceTitle}</span> ({task.crDate})
            </p>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-sm text-slate-400">Nothing here yet.</p>}
      </div>
    </section>
  );
}
