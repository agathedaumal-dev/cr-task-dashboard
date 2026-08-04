export const dynamic = "force-dynamic";

import { CrIngestionForm } from "@/components/dashboard/cr-task-dashboard/CrIngestionForm";

export default function CrIngestionPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Add meeting notes</h1>
      <p className="mb-6 text-sm text-slate-500">
        Paste a Granola export (or any meeting note) below. It gets parsed into tasks
        automatically — action items, assignee, due date, priority, and product tag.
      </p>
      <CrIngestionForm />
    </div>
  );
}
