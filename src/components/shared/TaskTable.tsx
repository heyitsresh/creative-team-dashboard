import Link from "next/link";
import type { NormalizedTask, SlaRule } from "@/types";
import { isBreached } from "@/lib/metrics";
import { fmtDate, statusDotColor, priorityDotColor } from "@/lib/taskDisplay";
import { Pill } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

/**
 * Hyperlinked, line-per-task table shared by the by-person queue (Team page)
 * and the by-client queue (Client Health drilldown) — same columns either
 * way, just swapping which identity column ("Client" vs "Assignee") shows
 * since the other one is already implied by the page you're on.
 */
export function TaskTable({
  tasks,
  rules,
  identityColumn,
}: {
  tasks: NormalizedTask[];
  rules: SlaRule[];
  identityColumn: "client" | "assignee";
}) {
  const rows = [...tasks].sort((a, b) => {
    const aOver = isBreached(a, rules) ? 1 : 0;
    const bOver = isBreached(b, rules) ? 1 : 0;
    if (aOver !== bOver) return bOver - aOver;
    return b.hoursInQueue - a.hoursInQueue;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-line label-caps font-normal">
            <th className="py-2 pr-3">Task</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Priority</th>
            <th className="py-2 px-3">
              {identityColumn === "client" ? "Client" : "Assignee"}
            </th>
            <th className="py-2 px-3">Content type</th>
            <th className="py-2 px-3 text-right">Days running</th>
            <th className="py-2 px-3">Due date</th>
            <th className="py-2 px-3">Project</th>
            <th className="py-2 pl-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const overdue = isBreached(t, rules);
            const days = Math.floor(t.hoursInQueue / 24);
            return (
              <tr key={t.key} className="border-b border-line/60 hover:bg-paper/60 transition-colors">
                <td className="py-2.5 pr-3">
                  <a
                    href={t.webUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-medium"
                  >
                    {t.key}
                  </a>
                  <p className="text-xs text-muted truncate max-w-xs">{t.summary}</p>
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1.5 text-ink/80 whitespace-nowrap">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: statusDotColor(t.status) }}
                    />
                    {t.status}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  {t.priority ? (
                    <span className="inline-flex items-center gap-1.5 text-ink/80 whitespace-nowrap">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: priorityDotColor(t.priority) }}
                      />
                      {t.priority}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5 px-3 text-ink/70">
                  {identityColumn === "client" ? (
                    t.client ? (
                      <Link
                        href={`/dashboard/health?client=${encodeURIComponent(t.client)}`}
                        className="hover:text-primary hover:underline transition-colors"
                      >
                        {t.client}
                      </Link>
                    ) : (
                      "—"
                    )
                  ) : t.assigneeEmail ? (
                    <Link
                      href={`/dashboard/queue?person=${encodeURIComponent(t.assigneeEmail)}`}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Avatar name={t.assigneeName || "?"} src={t.assigneeAvatarUrl} size={20} />
                      <span className="whitespace-nowrap">{t.assigneeName || t.assigneeEmail}</span>
                    </Link>
                  ) : (
                    t.assigneeName || "Unassigned"
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <Pill colorKey={t.contentType}>{t.contentType}</Pill>
                </td>
                <td
                  className={`py-2.5 px-3 text-right whitespace-nowrap ${
                    overdue ? "text-tag-pink-text font-semibold" : "text-ink/70"
                  }`}
                >
                  {days}d
                </td>
                <td className="py-2.5 px-3 text-ink/70 whitespace-nowrap">{fmtDate(t.dueDate)}</td>
                <td className="py-2.5 px-3 text-ink/60">{t.projectKey}</td>
                <td className="py-2.5 pl-3 text-ink/60 whitespace-nowrap">{fmtDate(t.updated)}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td className="py-6 text-muted" colSpan={9}>
                No tasks to show.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
