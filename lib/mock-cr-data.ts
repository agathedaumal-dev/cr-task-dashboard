// Mock data used when DATABASE_URL isn't configured yet — mirrors the
// template's db-optional convention (see app/(main)/page.tsx) and the sample
// CRs in the original prep kit (samples/*.md).

import type { TaskCardData } from "@/components/dashboard/cr-task-dashboard/MyToDoView";
import type { InterlocutorData, FollowUpTask } from "@/components/dashboard/cr-task-dashboard/InterlocutorHub";
import type { ProductTask } from "@/components/dashboard/cr-task-dashboard/ProductHub";

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const MOCK_INTERLOCUTORS: InterlocutorData[] = [
  { id: "julien", name: "Julien Marchand", role: "Groupe Habitat", whatTheyDo: "MRH B2C portfolio owner on the client side." },
  { id: "fatima", name: "Fatima Zahra", role: "Souscritoo", whatTheyDo: "Handles résiliation follow-ups for MRH." },
  { id: "marta", name: "Marta Fernandez", role: "Iberia Energy", whatTheyDo: "Carbon Comp Spain sponsor, validates pitch internally." },
  { id: "luca", name: "Luca Bianchi", role: "Verde Energia", whatTheyDo: "Carbon Comp Italy sales lead." },
];

export const MOCK_MY_TODO_TASKS: TaskCardData[] = [
  { id: "t1", title: "Send recouvrement report to Julien", productId: "mrh", dueDate: iso(-2), priority: "High", status: "To Do", type: "my-todo", assignee: "Me", delegatedTo: null, notes: null, crSourceTitle: "Point hebdo MRH - Groupe Habitat", crDate: "2026-07-28" },
  { id: "t2", title: "Prepare impayés slide for the Aug 15 committee", productId: "mrh", dueDate: iso(0), priority: "Medium", status: "To Do", type: "my-todo", assignee: "Me", delegatedTo: null, notes: null, crSourceTitle: "Point hebdo MRH - Groupe Habitat", crDate: "2026-07-28" },
  { id: "t3", title: "Send updated pricing sheet to Luca", productId: "carbon-comp-it", dueDate: iso(1), priority: "High", status: "To Do", type: "my-todo", assignee: "Me", delegatedTo: null, notes: null, crSourceTitle: "Carbon Comp Italy sync", crDate: "2026-07-30" },
  { id: "t4", title: "Send updated report to Marta", productId: "carbon-comp-sp", dueDate: iso(4), priority: "Medium", status: "To Do", type: "my-todo", assignee: "Me", delegatedTo: null, notes: null, crSourceTitle: "Seguimiento Carbon Comp España", crDate: "2026-07-29" },
  { id: "t5", title: "Pick a date for the next joint committee", productId: "carbon-comp-sp", dueDate: null, priority: "Low", status: "To Do", type: "my-todo", assignee: "Me", delegatedTo: null, notes: null, crSourceTitle: "Seguimiento Carbon Comp España", crDate: "2026-07-29" },
];

export const MOCK_FOLLOWUP_TASKS: FollowUpTask[] = [
  { id: "f1", interlocutorId: "julien", title: "Confirm impayés trend is stabilizing", type: "we-follow-together", productId: "mrh", priority: "Medium", assignee: "Me", dueDate: iso(7), status: "To Do", delegatedTo: null, notes: null, crSourceTitle: "Point hebdo MRH - Groupe Habitat", crDate: "2026-07-28" },
  { id: "f2", interlocutorId: "fatima", title: "Relance clients en résiliation", type: "they-owe-me", productId: "mrh", priority: "Medium", assignee: "fatima", dueDate: iso(3), status: "In Progress", delegatedTo: null, notes: null, crSourceTitle: "Point hebdo MRH - Groupe Habitat", crDate: "2026-07-28" },
  { id: "f3", interlocutorId: "marta", title: "Validate new pitch before Aug 20 meeting", type: "they-owe-me", productId: "carbon-comp-sp", priority: "Medium", assignee: "marta", dueDate: iso(10), status: "To Do", delegatedTo: null, notes: null, crSourceTitle: "Seguimiento Carbon Comp España", crDate: "2026-07-29" },
  { id: "f4", interlocutorId: "luca", title: "Report back from internal sales follow-up", type: "they-owe-me", productId: "carbon-comp-it", priority: "Medium", assignee: "luca", dueDate: iso(5), status: "To Do", delegatedTo: null, notes: null, crSourceTitle: "Carbon Comp Italy sync", crDate: "2026-07-30" },
];

export const MOCK_PRODUCT_TASKS: Record<string, { mine: ProductTask[]; theirs: ProductTask[] }> = {
  "carbon-comp-fr": { mine: [], theirs: [] },
  "carbon-comp-sp": {
    mine: [
      { id: "t4", title: "Send updated report to Marta", assignee: "Me", assigneeName: "Me", type: "my-todo", status: "To Do", dueDate: iso(4), priority: "Medium", delegatedTo: null, notes: null, crSourceTitle: "Seguimiento Carbon Comp España", crDate: "2026-07-29" },
    ],
    theirs: [
      { id: "f3", title: "Validate new pitch internally", assignee: "marta", assigneeName: "Marta Fernandez", type: "they-owe-me", status: "To Do", dueDate: iso(10), priority: "Medium", delegatedTo: null, notes: null, crSourceTitle: "Seguimiento Carbon Comp España", crDate: "2026-07-29" },
    ],
  },
  "carbon-comp-it": {
    mine: [
      { id: "t3", title: "Send updated pricing sheet to Luca", assignee: "Me", assigneeName: "Me", type: "my-todo", status: "To Do", dueDate: iso(1), priority: "High", delegatedTo: null, notes: null, crSourceTitle: "Carbon Comp Italy sync", crDate: "2026-07-30" },
    ],
    theirs: [
      { id: "f4", title: "Report back from internal sales follow-up", assignee: "luca", assigneeName: "Luca Bianchi", type: "they-owe-me", status: "To Do", dueDate: iso(5), priority: "Medium", delegatedTo: null, notes: null, crSourceTitle: "Carbon Comp Italy sync", crDate: "2026-07-30" },
    ],
  },
  mrh: {
    mine: [
      { id: "t1", title: "Send recouvrement report to Julien", assignee: "Me", assigneeName: "Me", type: "my-todo", status: "To Do", dueDate: iso(-2), priority: "High", delegatedTo: null, notes: null, crSourceTitle: "Point hebdo MRH - Groupe Habitat", crDate: "2026-07-28" },
      { id: "t2", title: "Prepare impayés slide for committee", assignee: "Me", assigneeName: "Me", type: "my-todo", status: "To Do", dueDate: iso(0), priority: "Medium", delegatedTo: null, notes: null, crSourceTitle: "Point hebdo MRH - Groupe Habitat", crDate: "2026-07-28" },
    ],
    theirs: [
      { id: "f2", title: "Relance clients en résiliation", assignee: "fatima", assigneeName: "Fatima Zahra", type: "they-owe-me", status: "In Progress", dueDate: iso(3), priority: "Medium", delegatedTo: null, notes: null, crSourceTitle: "Point hebdo MRH - Groupe Habitat", crDate: "2026-07-28" },
    ],
  },
  other: { mine: [], theirs: [] },
};
