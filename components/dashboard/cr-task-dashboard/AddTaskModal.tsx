"use client";

import { useEffect, useState } from "react";
import type { InterlocutorOption, EditableTask } from "./TaskEditModal";

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

// Manual task creation — the replacement for the removed /cr-ingestion
// "paste a CR" page. Always starts as status "To Do"; everything else
// (status, notes, delegation, ...) is edited afterwards through the normal
// click-to-open TaskEditModal, so this stays a short, single-purpose form.
export function AddTaskModal({
  interlocutors,
  defaultAssignee = "Me",
  defaultType = "my-todo",
  defaultProductId = "other",
  onClose,
  onCreated,
}: {
  interlocutors: InterlocutorOption[];
  defaultAssignee?: string;
  defaultType?: EditableTask["type"];
  defaultProductId?: EditableTask["productId"];
  onClose: () => void;
  onCreated: (task: unknown) => void;
}) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(defaultAssignee);
  const [type, setType] = useState<EditableTask["type"]>(defaultType);
  const [productId, setProductId] = useState<EditableTask["productId"]>(defaultProductId);
  const [priority, setPriority] = useState<EditableTask["priority"]>("Medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          assignee,
          type,
          productId,
          priority,
          dueDate: dueDate || null,
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Failed to create task" }));
        throw new Error(msg ?? "Failed to create task");
      }
      const { task } = await res.json();
      onCreated(task);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
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
          <h2 className="text-base font-semibold text-slate-800">Add task</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Task title…"
          className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-indigo-300 focus:outline-none"
        />

        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
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

          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EditableTask["type"])}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Product">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value as EditableTask["productId"])}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              {Object.entries(PRODUCT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as EditableTask["priority"])}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </Field>

          <Field label="Due date" full>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add task"}
          </button>
        </div>
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
