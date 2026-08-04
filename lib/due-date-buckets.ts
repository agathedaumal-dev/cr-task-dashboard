// Buckets tasks into Overdue / Today / This Week / Upcoming / TBD for the
// My To-Do view. Pure function, no framework deps — unit-testable directly.

export type DueBucket = "Overdue" | "Today" | "This Week" | "Upcoming" | "TBD";

export interface BucketableTask {
  id: string;
  dueDate: string | null; // ISO date string, or null for "TBD"
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function bucketDueDate(dueDate: string | null, now: Date = new Date()): DueBucket {
  if (!dueDate) return "TBD";

  const today = startOfDay(now);
  const due = startOfDay(new Date(dueDate));

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((due.getTime() - today.getTime()) / msPerDay);

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";

  // "This Week" = remaining days until the upcoming Sunday (ISO-ish, Monday-start week).
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Mon=1..Sun=7
  const daysLeftInWeek = 7 - dayOfWeek;
  if (diffDays <= daysLeftInWeek) return "This Week";

  return "Upcoming";
}

export function groupTasksByBucket<T extends BucketableTask>(
  tasks: T[],
  now: Date = new Date()
): Record<DueBucket, T[]> {
  const groups: Record<DueBucket, T[]> = {
    Overdue: [],
    Today: [],
    "This Week": [],
    Upcoming: [],
    TBD: [],
  };
  for (const task of tasks) {
    groups[bucketDueDate(task.dueDate, now)].push(task);
  }
  return groups;
}
