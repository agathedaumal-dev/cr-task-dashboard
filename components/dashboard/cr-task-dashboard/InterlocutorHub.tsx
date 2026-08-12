"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AddInterlocutorForm } from "./AddInterlocutorForm";
import { TaskEditModal, type EditableTask, type InterlocutorOption } from "./TaskEditModal";
import { AddTaskModal } from "./AddTaskModal";

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
  productId: "carbon-comp-fr" | "carbon-comp-sp" | "carbon-comp-it" | "mrh" | "other";
  priority: "High" | "Medium" | "Low";
  assignee: string;
  dueDate: string | null;
  status: "To Do" | "In Progress" | "Blocked" | "Done";
  delegatedTo: string | null;
  notes: string | null;
  crSourceTitle: string;
  crDate: string;
}

// A task originally owned by someone else (assignee/type/interlocutorId
// unchanged) but delegated to this interlocutor, so it also shows up here,
// greyed out, tagged with who it's really still owned/followed by.
export interface DelegatedInTask {
  id: string;
  delegateeId: string; // the interlocutor this was delegated to
  ownerLabel: string; // display name of whoever still owns/follows it (e.g. "Agathe")
  title: string;
  productId: "carbon-comp-fr" | "carbon-comp-sp" | "carbon-comp-it" | "mrh" | "other";
  type: "my-todo" | "i-owe-them" | "they-owe-me" | "we-follow-together";
  assignee: string;
  priority: "High" | "Medium" | "Low";
  dueDate: string | null;
  status: "To Do" | "In Progress" | "Blocked" | "Done";
  notes: string | null;
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

const STATUS_STYLES: Record<FollowUpTask["status"], string> = {
  "To Do": "bg-slate-100 text-slate-600",
  "In Progress": "bg-indigo-100 text-indigo-700",
  Blocked: "bg-rose-100 text-rose-700",
  Done: "bg-emerald-100 text-emerald-700",
};

const STATUS_OPTIONS: (FollowUpTask["status"] | "All" | "AllButDone")[] = ["All", "AllButDone", "To Do", "In Progress", "Blocked", "Done"];

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
  delegatedTasks = [],
}: {
  interlocutors: InterlocutorData[];
  tasks: FollowUpTask[];
  delegatedTasks?: DelegatedInTask[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FollowUpTask["status"] | "All" | "AllButDone">("All");
  // Only meaningful on a shared team page (e.g. "Customer Care MRH") — lets
  // you narrow the four sections down to one specific member instead of
  // seeing everyone's tasks mixed together.
  const [personFilter, setPersonFilter] = useState<string>("All");
  // Optimistic local overlay, same pattern as My To-Do, so a card visibly jumps
  // to its new column immediately instead of waiting for a full page refresh.
  const [overrides, setOverrides] = useState<Record<string, Partial<FollowUpTask>>>({});
  const [dragOverColumn, setDragOverColumn] = useState<FollowUpType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [copyPanelOpen, setCopyPanelOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const interlocutorOptions: InterlocutorOption[] = interlocutors.map((i) => ({ id: i.id, name: i.name }));

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
    () => tasks.filter((t) => !deletedIds.has(t.id)).map((t) => ({ ...t, ...overrides[t.id] })),
    [tasks, overrides, deletedIds]
  );

  const effectiveDelegatedTasks = useMemo(
    () => delegatedTasks.filter((t) => !deletedIds.has(t.id)),
    [delegatedTasks, deletedIds]
  );

  const moveTask = (taskId: string, newType: FollowUpType) => {
    const task = effectiveTasks.find((t) => t.id === taskId);
    if (!task || task.type === newType) return;
    setOverrides((prev) => ({ ...prev, [taskId]: { ...prev[taskId], type: newType } }));
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

  // A stale personFilter from a previous team (e.g. still set to "Dylan
  // Rybstein" after switching to a different team) would silently show
  // nothing — reset it whenever the selected page changes.
  useEffect(() => {
    setPersonFilter("All");
  }, [effectiveSelectedKey]);

  // On a team page, narrow memberIdSet down to just the one person picked
  // in the filter below; on a solo page (or "All" on a team page) this is
  // identical to memberIdSet.
  const visibleMemberIdSet =
    isTeam && personFilter !== "All" ? new Set([personFilter]) : memberIdSet;

  // Prefix a task's title with the owner's name only when viewing a team page
  // (an ungrouped person's own page doesn't need their name repeated).
  const withOwnerPrefix = (t: FollowUpTask) =>
    isTeam ? { ...t, title: `[${nameById[t.interlocutorId] ?? "?"}] ${t.title}` } : t;

  const applyStatusFilter = <T extends { status: FollowUpTask["status"] }>(list: T[]) => {
    if (statusFilter === "All") return list;
    if (statusFilter === "AllButDone") return list.filter((t) => t.status !== "Done");
    return list.filter((t) => t.status === statusFilter);
  };

  const iOweThem = applyStatusFilter(
    effectiveTasks.filter((t) => visibleMemberIdSet.has(t.interlocutorId) && t.type === "i-owe-them")
  ).map(withOwnerPrefix);
  const theyOweMe = applyStatusFilter(
    effectiveTasks.filter((t) => visibleMemberIdSet.has(t.interlocutorId) && t.type === "they-owe-me")
  ).map(withOwnerPrefix);
  const weFollowTogether = applyStatusFilter(
    effectiveTasks.filter((t) => visibleMemberIdSet.has(t.interlocutorId) && t.type === "we-follow-together")
  ).map(withOwnerPrefix);

  // Delegated-in tasks now respect the same status filter as the three
  // columns above, so the dropdown consistently controls the whole page.
  // Filtered by delegateeId rather than interlocutorId — it's whichever
  // team member the task was actually delegated to.
  const delegatedIn = applyStatusFilter(effectiveDelegatedTasks.filter((t) => visibleMemberIdSet.has(t.delegateeId)));

  // Plain-text bullet list of this person/team's outstanding work — for
  // pasting into a Slack message or a 1:1 doc before a meeting. Mirrors
  // whatever's currently on screen (the four lists above, which already
  // have the status filter applied), not a separate fixed "everything
  // active" set.
  const bulletListText = useMemo(() => {
    const bullet = (t: { title: string; dueDate: string | null; status: FollowUpTask["status"] }) =>
      `- ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}${t.status !== "To Do" ? ` [${t.status}]` : ""}`;

    const sections: string[] = [];
    if (iOweThem.length > 0) sections.push(`What I owe them:\n${iOweThem.map(bullet).join("\n")}`);
    if (theyOweMe.length > 0) sections.push(`What they owe me:\n${theyOweMe.map(bullet).join("\n")}`);
    if (weFollowTogether.length > 0) sections.push(`What we follow together:\n${weFollowTogether.map(bullet).join("\n")}`);
    if (delegatedIn.length > 0) sections.push(`Delegated to them:\n${delegatedIn.map(bullet).join("\n")}`);

    return sections.length > 0 ? sections.join("\n\n") : "Nothing matches the current filters.";
  }, [iOweThem, theyOweMe, weFollowTogether, delegatedIn]);

  const copyBulletList = async () => {
    try {
      await navigator.clipboard.writeText(bulletListText);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2000);
  };

  const openFollowUp = effectiveTasks.find((t) => t.id === openTaskId);
  const openDelegated = effectiveDelegatedTasks.find((t) => t.id === openTaskId);
  const editableTask: EditableTask | null = openFollowUp
    ? {
        id: openFollowUp.id,
        title: openFollowUp.title,
        productId: openFollowUp.productId,
        type: openFollowUp.type,
        assignee: openFollowUp.assignee,
        priority: openFollowUp.priority,
        status: openFollowUp.status,
        dueDate: openFollowUp.dueDate,
        delegatedTo: openFollowUp.delegatedTo,
        notes: openFollowUp.notes,
        crSourceTitle: openFollowUp.crSourceTitle,
        crDate: openFollowUp.crDate,
      }
    : openDelegated
      ? {
          id: openDelegated.id,
          title: openDelegated.title,
          productId: openDelegated.productId,
          type: openDelegated.type,
          assignee: openDelegated.assignee,
          priority: openDelegated.priority,
          status: openDelegated.status,
          dueDate: openDelegated.dueDate,
          delegatedTo: openDelegated.delegateeId,
          notes: openDelegated.notes,
          crSourceTitle: openDelegated.crSourceTitle,
          crDate: openDelegated.crDate,
        }
      : null;

  const onSaved = (updated: Partial<EditableTask>) => {
    if (!openTaskId) return;
    setOverrides((prev) => ({ ...prev, [openTaskId]: { ...prev[openTaskId], ...updated } as Partial<FollowUpTask> }));
    startTransition(() => router.refresh());
  };

  const onDeleted = () => {
    if (!openTaskId) return;
    setDeletedIds((prev) => new Set(prev).add(openTaskId));
    startTransition(() => router.refresh());
  };

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
            <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-slate-800">{selectedEntry.label}</h1>
                <p className="text-sm text-slate-500">
                  {isTeam ? `Shared page — ${selectedEntry.subtitle}` : selectedEntry.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isTeam && (
                  <select
                    value={personFilter}
                    onChange={(e) => setPersonFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none"
                  >
                    <option value="All">Everyone on this page</option>
                    {selectedEntry.memberIds.map((id) => (
                      <option key={id} value={id}>
                        {nameById[id] ?? id}
                      </option>
                    ))}
                  </select>
                )}
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
                <button
                  onClick={() => setAddTaskOpen(true)}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  + Add task
                </button>
                <button
                  onClick={() => {
                    setCopyPanelOpen((v) => !v);
                    setCopyState("idle");
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-indigo-300"
                >
                  📋 Copy task list
                </button>
              </div>
            </header>

            {copyPanelOpen && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Matches your current status filter — select all &amp; copy, or use the button
                  </p>
                  <button
                    onClick={copyBulletList}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    {copyState === "copied" ? "Copied ✓" : copyState === "failed" ? "Copy failed — select manually" : "Copy"}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={bulletListText}
                  onFocus={(e) => e.currentTarget.select()}
                  rows={Math.min(14, Math.max(4, bulletListText.split("\n").length))}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-700 focus:outline-none"
                />
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMsg}
              </div>
            )}

            <p className="mb-3 text-xs text-slate-400">
              Drag a card to move it between boxes, or click it to open the full editor.
            </p>

            <div className="space-y-4">
              {/* Stacked vertically (not side-by-side) so each box's height
                  can shrink to fit its own content — an empty box stays
                  small instead of matching a taller neighbour. */}
              <FollowUpColumn
                title="What they owe me"
                type="they-owe-me"
                accent="border-amber-200 bg-amber-50/40"
                items={theyOweMe}
                isDragOver={dragOverColumn === "they-owe-me"}
                onDragOverColumn={setDragOverColumn}
                onDropTask={moveTask}
                onOpen={setOpenTaskId}
                draggingId={draggingId}
                setDraggingId={setDraggingId}
              />
              <FollowUpColumn
                title="What I owe them"
                type="i-owe-them"
                accent="border-rose-200 bg-rose-50/40"
                items={iOweThem}
                isDragOver={dragOverColumn === "i-owe-them"}
                onDragOverColumn={setDragOverColumn}
                onDropTask={moveTask}
                onOpen={setOpenTaskId}
                draggingId={draggingId}
                setDraggingId={setDraggingId}
              />
              <FollowUpColumn
                title="What we follow together"
                type="we-follow-together"
                accent="border-emerald-200 bg-emerald-50/40"
                items={weFollowTogether}
                isDragOver={dragOverColumn === "we-follow-together"}
                onDragOverColumn={setDragOverColumn}
                onDropTask={moveTask}
                onOpen={setOpenTaskId}
                draggingId={draggingId}
                setDraggingId={setDraggingId}
              />

              {delegatedIn.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-slate-100/60 p-4">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Delegated to {isTeam ? "them" : selectedEntry.label}{" "}
                    <span className="text-slate-400">({delegatedIn.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {delegatedIn.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setOpenTaskId(task.id)}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white/70 px-3 py-2 hover:border-indigo-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-500">{task.title}</p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}
                          >
                            {task.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          Still followed by {task.ownerLabel} · Due {task.dueDate ?? "TBD"} · from{" "}
                          <span className="italic">{task.crSourceTitle}</span> ({task.crDate}){" "}
                          {task.notes && <span title="Has notes">📝</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </main>

      {editableTask && (
        <TaskEditModal
          task={editableTask}
          interlocutors={interlocutorOptions}
          onClose={() => setOpenTaskId(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}

      {addTaskOpen && (
        <AddTaskModal
          interlocutors={interlocutorOptions}
          // Solo page → default to that person (most tasks here are
          // "they owe me"); team page → default to "Me", pick the right
          // member from the Assignee dropdown instead of guessing.
          defaultAssignee={
            !isTeam && selectedEntry
              ? selectedEntry.memberIds[0]
              : isTeam && personFilter !== "All"
                ? personFilter
                : "Me"
          }
          defaultType="they-owe-me"
          onClose={() => setAddTaskOpen(false)}
          onCreated={() => startTransition(() => router.refresh())}
        />
      )}
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
  onOpen,
  draggingId,
  setDraggingId,
}: {
  title: string;
  type: FollowUpType;
  accent: string;
  items: FollowUpTask[];
  compact?: boolean;
  isDragOver: boolean;
  onDragOverColumn: (type: FollowUpType | null) => void;
  onDropTask: (taskId: string, newType: FollowUpType) => void;
  onOpen: (id: string) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
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
          {items.map((task) => {
            const isDelegated = Boolean(task.delegatedTo);
            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  setDraggingId(task.id);
                  e.dataTransfer.setData(DRAG_MIME, task.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDraggingId(null)}
                onClick={() => {
                  // A real drag sets draggingId before any click fires; only
                  // treat this as "open" when it wasn't a drag gesture.
                  if (draggingId !== task.id) onOpen(task.id);
                }}
                className={`cursor-grab active:cursor-grabbing ${
                  compact
                    ? "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                    : "rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                } ${isDelegated ? "bg-slate-100/70" : ""} hover:border-indigo-200`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={
                      compact
                        ? `font-medium ${isDelegated ? "text-slate-500" : "text-slate-800"}`
                        : `text-sm font-medium ${isDelegated ? "text-slate-500" : "text-slate-800"}`
                    }
                  >
                    {task.title}
                  </p>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[task.status]}`}>
                    {task.status}
                  </span>
                </div>
                {!compact && (
                  <p className="text-xs text-slate-400">
                    Due {task.dueDate ?? "TBD"} · from <span className="italic">{task.crSourceTitle}</span> (
                    {task.crDate}) {task.notes && <span title="Has notes">📝</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
