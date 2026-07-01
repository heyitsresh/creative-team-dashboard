import type { NormalizedTask } from "@/types";

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7; // Monday-start week
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function weekLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Buckets tasks into the last `weeks` weeks by creation date (throughput in)
 * and by "updated" date for tasks currently Done (a proxy for completion —
 * Jira's REST search doesn't give us a true resolution-date history without
 * per-issue changelog calls, which would be expensive to pull for every task
 * on every dashboard load).
 */
export function weeklyThroughput(tasks: NormalizedTask[], weeks = 10) {
  const now = startOfWeek(new Date());
  const buckets: { start: Date; created: number; completed: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - i * 7);
    buckets.push({ start, created: 0, completed: 0 });
  }

  function bucketFor(date: Date) {
    const wk = startOfWeek(date).getTime();
    return buckets.find((b) => b.start.getTime() === wk);
  }

  for (const t of tasks) {
    const created = bucketFor(new Date(t.created));
    if (created) created.created += 1;

    if (t.statusCategory === "done") {
      const completed = bucketFor(new Date(t.updated));
      if (completed) completed.completed += 1;
    }
  }

  let runningBacklog = 0;
  return buckets.map((b) => {
    runningBacklog += b.created - b.completed;
    return {
      period: weekLabel(b.start),
      Created: b.created,
      Completed: b.completed,
      "Net backlog change": runningBacklog,
    };
  });
}
