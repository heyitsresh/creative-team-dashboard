import { MessageSquare, Clock } from "lucide-react";
import type { NormalizedTask, SlaRule } from "@/types";
import { isBreached } from "@/lib/metrics";
import { Pill } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

export function TaskCard({
  task,
  rules,
  hasNote,
}: {
  task: NormalizedTask;
  rules: SlaRule[];
  hasNote?: boolean;
}) {
  const breached = isBreached(task, rules);
  const days = Math.floor(task.hoursInQueue / 24);

  return (
    <a
      href={task.webUrl}
      target="_blank"
      rel="noreferrer"
      className="block bg-white border border-line rounded-2xl p-4 hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-200 animate-fade-slide-in"
    >
      <div className="flex items-center justify-between mb-2.5">
        <Pill colorKey={task.contentType}>{task.contentType}</Pill>
        {breached && (
          <span className="pill bg-red-800 text-white font-semibold">Overdue</span>
        )}
      </div>

      <p className="text-sm font-medium text-ink leading-snug line-clamp-2 mb-1">
        {task.summary}
      </p>
      <p className="text-xs text-muted truncate mb-3">{task.client || "No client"}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Clock size={12} />
          {days > 0 ? `${days}d` : `${Math.round(task.hoursInQueue)}h`}
        </div>
        <div className="flex items-center gap-2">
          {hasNote && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <MessageSquare size={12} />
            </span>
          )}
          {task.assigneeName && <Avatar name={task.assigneeName} size={22} />}
        </div>
      </div>
    </a>
  );
}
