import { useEffect, useMemo, useState } from "react";
import type { NormalizedTask, SlaRule, TeamMember } from "@/types";
import { isBreached } from "@/lib/metrics";
import { Avatar } from "@/components/ui/Avatar";
import { TaskTable } from "@/components/shared/TaskTable";

function matches(member: TeamMember, task: NormalizedTask) {
  if (!member.jira_email || !task.assigneeEmail) return false;
  return member.jira_email.toLowerCase() === task.assigneeEmail.toLowerCase();
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
            {selected.tasks.length} open task{selected.tasks.length === 1 ? "" : "s"}
            {selected.overdueCount > 0 && (
              <span className="text-tag-pink-text font-medium">
                {" "}
                · {selected.overdueCount} overdue
              </span>
            )}
          </p>
          <TaskTable tasks={selected.tasks} rules={rules} identityColumn="client" />
        </>
      )}
    </div>
  );
}
