import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { NormalizedTask, SlaRule, TeamMember } from "@/types";
import { isBreached } from "@/lib/metrics";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Card";

function matches(member: TeamMember, task: NormalizedTask) {
  if (!member.jira_email || !task.assigneeEmail) return false;
  return member.jira_email.toLowerCase() === task.assigneeEmail.toLowerCase();
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const DOT_PALETTE = ["#6C5CE7", "#E0529C", "#F5A623", "#1FAA59", "#3D7BFD", "#B983FF"];

const PRIORITY_COLOR: Record<string, string> = {
  highest: "#E0529C",
  high: "#E0529C",
  medium: "#F5A623",
  low: "#1FAA59",
  lowest: "#1FAA59",
};

function hashColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return DOT_PALETTE[Math.abs(hash) % DOT_PALETTE.length];
}

/**
 * "By person" picker + task table, modeled on the earlier Jira dashboard's
 * By Assignee screen (avatar row with an open-count badge, then a
 * hyperlinked task table for whoever's selected) — minus the per-task notes
 * field, which this app intentionally doesn't have.
 */
export function AssigneeQueue({
  members,
  tasks,
  rules,
}: {
  members: TeamMember[];
  tasks: NormalizedTask[]; // expects open-only tasks
  rules: SlaRule[];
}) {
  const perMember = useMemo(
    () =>
      members.map((m) => {
        const mine = tasks.filter((t) => matches(m, t));
        const overdue = mine.filter((t) => isBreached(t, rules));
        return { member: m, tasks: mine, overdueCount: overdue.length };
      }),
    [members, tasks, rules]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // Default to whoever has the most overdue work (falls back to most open
    // tasks) so the table lands on someone worth looking at, not row zero.
    if (selectedId && perMember.some((p) => p.member.id === selectedId)) return;
    const sorted = [...perMember].sort(
      (a, b) => b.overdueCount - a.overdueCount || b.tasks.length - a.tasks.length
    );
    setSelectedId(sorted[0]?.member.id ?? null);
  }, [perMember, selectedId]);

  const selected = perMember.find((p) => p.member.id === selectedId);

  const rows = useMemo(() => {
    if (!selected) return [];
    return [...selected.tasks].sort((a, b) => {
      const aOver = isBreached(a, rules) ? 1 : 0;
      const bOver = isBreached(b, rules) ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;
      return b.hoursInQueue - a.hoursInQueue;
    });
  }, [selected, rules]);

  if (members.length === 0) {
    return (
      <div className="card text-sm text-muted">
        No team members yet.{" "}
        <a href="/dashboard/settings" className="text-primary font-medium">
          Set up your org chart in Settings →
        </a>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">By person</h2>

      <div className="flex items-center gap-4 flex-wrap mb-6 pb-6 border-b border-line">
        {perMember.map(({ member, tasks: mine, overdueCount }) => {
          const isSelected = member.id === selectedId;
          const avatarUrl = mine.find((t) => t.assigneeAvatarUrl)?.assigneeAvatarUrl;
          return (
            <button
              key={member.id}
              onClick={() => setSelectedId(member.id)}
              className={`btn-press flex flex-col items-center gap-1.5 w-20 transition-opacity duration-150 ${
                isSelected ? "" : "opacity-60 hover:opacity-100"
              }`}
            >
              <div className="relative">
                <Avatar name={member.name} src={avatarUrl} size={44} />
                {mine.length > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ring-2 ring-white ${
                      overdueCount > 0 ? "bg-tag-pink-text" : "bg-primary"
                    }`}
                  >
                    {mine.length}
                  </span>
                )}
                {isSelected && (
                  <span className="absolute -inset-1 rounded-full ring-2 ring-primary pointer-events-none" />
                )}
              </div>
              <span className="text-xs font-medium text-ink/80 truncate w-full text-center">
                {member.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          <p className="text-sm text-muted mb-3">
            <span className="font-semibold text-ink">{selected.member.name}</span> ·{" "}
            {rows.length} open task{rows.length === 1 ? "" : "s"}
            {selected.overdueCount > 0 && (
              <span className="text-tag-pink-text font-medium">
                {" "}
                · {selected.overdueCount} overdue
              </span>
            )}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line label-caps font-normal">
                  <th className="py-2 pr-3">Task</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Priority</th>
                  <th className="py-2 px-3">Client</th>
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
                    <tr
                      key={t.key}
                      className="border-b border-line/60 hover:bg-paper/60 transition-colors"
                    >
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
                            style={{ backgroundColor: hashColor(t.status) }}
                          />
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {t.priority ? (
                          <span className="inline-flex items-center gap-1.5 text-ink/80 whitespace-nowrap">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  PRIORITY_COLOR[t.priority.toLowerCase()] || "#8C8AA0",
                              }}
                            />
                            {t.priority}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-ink/70">
                        {t.client ? (
                          <Link
                            href={`/dashboard/health?client=${encodeURIComponent(t.client)}`}
                            className="hover:text-primary hover:underline transition-colors"
                          >
                            {t.client}
                          </Link>
                        ) : (
                          "—"
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
                      <td className="py-2.5 px-3 text-ink/70 whitespace-nowrap">
                        {fmtDate(t.dueDate)}
                      </td>
                      <td className="py-2.5 px-3 text-ink/60">{t.projectKey}</td>
                      <td className="py-2.5 pl-3 text-ink/60 whitespace-nowrap">
                        {fmtDate(t.updated)}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td className="py-6 text-muted" colSpan={9}>
                      No open tasks for this person.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
