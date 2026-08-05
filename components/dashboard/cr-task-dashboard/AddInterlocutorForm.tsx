"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const PRODUCTS = [
  { value: "", label: "No default product" },
  { value: "carbon-comp-fr", label: "Carbon Comp FR" },
  { value: "carbon-comp-sp", label: "Carbon Comp SP" },
  { value: "carbon-comp-it", label: "Carbon Comp IT" },
  { value: "mrh", label: "MRH" },
  { value: "other", label: "Other" },
];

export function AddInterlocutorForm() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [whatTheyDo, setWhatTheyDo] = useState("");
  const [defaultProductId, setDefaultProductId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/interlocutors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          whatTheyDo,
          defaultProductId: defaultProductId || null,
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Failed to save" }));
        throw new Error(msg);
      }
      setName("");
      setRole("");
      setWhatTheyDo("");
      setDefaultProductId("");
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
      >
        + Add interlocutor
      </button>
    );
  }

  return (
    <div className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
      />
      <input
        placeholder="Role / company"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
      />
      <input
        placeholder="What they do"
        value={whatTheyDo}
        onChange={(e) => setWhatTheyDo(e.target.value)}
        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
      />
      <select
        value={defaultProductId}
        onChange={(e) => setDefaultProductId(e.target.value)}
        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
      >
        {PRODUCTS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 rounded-md bg-indigo-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
