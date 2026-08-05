"use client";

import { useEffect, useState } from "react";

// Shared full-edit shape used by every dashboard view. Any view that wants
// click-to-open-modal editing maps its own row type into this before passing
// it in.
export interface EditableTask {
  id: string;
  title: string;
  productId: "carbon-comp-fr" | "carbon-comp-sp" | "carbon-comp-it" | "mrh" | "other";
  type: "my-todo" | "i-owe-them" | "they-owe-me" | "we-follow-together";
  assignee: string; // "Me" or an interlocutors.id
  priority: "High" | "Medium" | "Low";
  status: "To Do" | "In Progress" | "Blocked" | "Done";
  dueDate: string | null;
  delegatedTo: string | null; // interlocutors.id or null
  crSourceTitle: string;
  crDate: string;
}

export interface InterlocutorOption {
  id: string;
  name: string;
}

const PRODUCT_LABELS: Record<EditableTask["productId"], string> = {
  "carbon-comp-fr": "Carbon Comp FR",
  "carbon-comp-sp": "Carbon Comp SP",
  "carbon-comp-it": "Carbon Comp IT",
  mrh: "MRH",
  other: "Other",
};

const TYPE_LABELS: Record<EditableTask["type"], string> = {
  "my-todo": "My To-Do",
  "i-owe-them": "I Owe Them",
  "they-owe-me": "They Owe Me",
  "we-follow-together": "We Follow Together",
};

const STATUS_OPTIONS: EditableTask["status"][] = ["To Do", "In Progress", "Blocked", "Done"];

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
  const { task } = await res.json();
  return task;
}

// Click-to-open modal used from Product Hub and Interlocutor Hub so those
// pages get the exact same edit features as My To-Do, without ever
// navigating away — closing (Escape, backdrop click, or the × button) just
// unmounts the modal and leaves the underlying dashboard page exactly where
// it was.
export function TaskEditModal({
  task,
  interlocutors,
  onClose,
  onSaved,
}: {
  task: EditableTask;
  interlocutors: InterlocutorOption[];
  onClose: () => void;
  onSaved: (updated: Partial<EditableTask>) => void;
}) {
  const [draft, setDraft] = useState(task);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nameById = (id: string | null) => {
    if (!id) return null;
    if (id === "Me") return "Me";
    return interlocutors.find((i) => i.id === id)?.name ?? id;
  };

  // Delegation is a single-click toggle to Calindé specifically — not a
  // general-purpose dropdown — since she's the only person tasks ever get
  // delegated to. Defaults to "not delegated" (task stays fully yours).
  const calinde = interlocutors.find((i) => i.name.toLowerCase().startsWith("calind"));
  const isDelegatedToCalinde = Boolean(calinde) && draft.delegatedTo === calinde!.id;

  const field = (key: keyof EditableTask, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }) as EditableTask);
    setError(null);
    setSaving(key as string);
    patchTask(task.id, { [key]: value })
      .then((updated) => {
        setSaving(null);
        onSaved(updated);
      })
      .catch((e) => {
        setSaving(null);
        setError(e.message);
      });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (trimmed && trimmed !== task.title) field("title", trimmed);
            }}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-base font-semibold text-slate-800 focus:border-indigo-300 focus:outline-none"
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <p className="mb-3 text-xs text-slate-400">
          from <span className="italic">{draft.crSourceTitle}</span> ({draft.crDate})
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) => field("status", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority">
            <select
              value={draft.priority}
              onChange={(e) => field("priority", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </Field>

          <Field label="Due date">
            <input
              type="date"
              value={draft.dueDate ?? ""}
              onChange={(e) => field("dueDate", e.target.value || null)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Product">
            <select
              value={draft.productId}
              onChange={(e) => field("productId", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              {Object.entries(PRODUCT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Type">
            <select
              value={draft.type}
              onChange={(e) => field("type", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assignee">
            <select
              value={draft.assignee}
              onChange={(e) => field("assignee", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="Me">Me</option>
              {interlocutors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Delegation" full>
            {calinde ? (
              <button
                type="button"
                onClick={() => field("delegatedTo", isDelegatedToCalinde ? null : calinde.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  isDelegatedToCalinde
                    ? "border-slate-300 bg-slate-200 text-slate-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                }`}
              >
                {isDelegatedToCalinde ? "✓ Delegated to Calindé — click to undo" : "Delegate to Calindé"}
              </button>
            ) : (
              <p className="text-xs text-slate-400">No &quot;Calindé&quot; interlocutor found.</p>
            )}
            {isDelegatedToCalinde && (
              <p className="mt-1 text-xs text-slate-400">
                Still shows on your page (greyed out), and now also appears on Calindé&apos;s Interlocutor Hub page.
              </p>
            )}
          </Field>
        </div>

        {saving && <p className="mt-3 text-xs text-slate-400">Saving {saving}…</p>}
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}
