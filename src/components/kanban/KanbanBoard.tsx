import { useMemo } from "react";
import type { NormalizedTask, SlaRule, StatusCategory } from "@/types";
import { TaskCard } from "@/components/kanban/TaskCard";

const CATEGORY_ORDER: Record<StatusCategory, number> = {
  new: 0,
  indeterminate: 1,
  done: 2,
};

const CATEGORY_DOT: Record<StatusCategory, string> = {
  new: "bg-status-todo",
  indeterminate: "bg-status-progress",
  done: "bg-status-done",
};

export function KanbanBoard({
  tasks,
  rules,
  noteKeys,
  maxColumns = 6,
  maxPerColumn = 30,
}: {
  tasks: NormalizedTask[];
  rules: SlaRule[];
  noteKeys?: Set<string>;
  maxColumns?: number;
  maxPerColumn?: number;
}) {
  const columns = useMemo(() => {
    const byStatus = new Map<string, { category: StatusCategory; tasks: NormalizedTask[] }>();
    for (const t of tasks) {
      const entry = byStatus.get(t.status) ?? { category: t.statusCategory, tasks: [] };
      entry.tasks.push(t);
      byStatus.set(t.status, entry);
    }
    return Array.from(byStatus.entries())
      .map(([status, v]) => ({ status, ...v }))
      .sort((a, b) => {
        const catDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
        if (catDiff !== 0) return catDiff;
        return b.tasks.length - a.tasks.length;
      })
      .slice(0, maxColumns);
  }, [tasks, maxColumns]);

  if (columns.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">No tasks in view.</p>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 stagger">
      {columns.map((col) => (
        <div key={col.status} className="w-72 shrink-0 flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT[col.category]}`} />
            <h3 className="text-sm font-semibold text-ink">{col.status}</h3>
            <span className="ml-auto text-xs font-medium text-muted bg-line/60 rounded-full px-2 py-0.5">
              {col.tasks.length}
            </span>
          </div>
          <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
            {col.tasks.slice(0, maxPerColumn).map((task) => (
              <TaskCard
                key={task.key}
                task={task}
                rules={rules}
                hasNote={noteKeys?.has(task.key)}
              />
            ))}
            {col.tasks.length > maxPerColumn && (
              <p className="text-xs text-muted text-center py-2">
                +{col.tasks.length - maxPerColumn} more
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
