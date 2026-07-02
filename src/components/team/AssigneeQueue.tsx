import { useMemo, useState } from "react";
import type { NormalizedTask, SlaRule, TeamMember } from "@/types";
import { isBreached, taskMatchesMember } from "@/lib/metrics";
import { Avatar } from "@/components/ui/Avatar";
import { TaskTable } from "@/components/shared/TaskTable";

/**
 * "By person" picker + task table, modeled on the earlier Jira dashboard's
 * By Assignee screen — minus the per-task notes field, which this app
 * intentionally doesn't have.
 *
 * Multi-select, not single-select: with nobody's avatar toggled on, the
 * table below shows the WHOLE team's combined open tasks (not just one
 * auto-picked person, which used to hide everyone else's work by default).
 * Click one or more avatars to narrow the table down to just those people;
 * click them again to deselect.
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
        const mine = tasks.filter((t) => taskMatchesMember(t, m));
        const overdue = mine.filter((t) => isBreached(t, rules));
        return { member: m, tasks: mine, overdueCount: overdue.length };
      }),
    [members, tasks, rules]
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const scoped =
    selectedIds.size > 0 ? perMember.filter((p) => selectedIds.has(p.member.id)) : perMember;
  const scopedTasks = scoped.flatMap((p) => p.tasks);
  const scopedOverdue = scoped.reduce((s, p) => s + p.overdueCount, 0);

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
      <p className="text-xs text-muted -mt-3 mb-4">
        Showing the whole team by default — click a photo to highlight just that person (click
        again to deselect, or select several at once).
      </p>

      <div className="flex items-center gap-4 flex-wrap mb-6 pb-6 border-b border-line">
        {perMember.map(({ member, tasks: mine, overdueCount }) => {
          const isSelected = selectedIds.has(member.id);
          const dimmed = selectedIds.size > 0 && !isSelected;
          const avatarUrl = mine.find((t) => t.assigneeAvatarUrl)?.assigneeAvatarUrl;
          return (
            <button
              key={member.id}
              onClick={() => toggle(member.id)}
              className={`btn-press flex flex-col items-center gap-1.5 w-20 transition-opacity duration-150 ${
                dimmed ? "opacity-40 hover:opacity-80" : ""
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
        {selectedIds.size > 0 && (
          <button
            onClick={() => setSelectedIds(new Set())}
            className="btn-press text-xs text-primary font-medium self-center"
          >
            Clear selection
          </button>
        )}
      </div>

      <p className="text-sm text-muted mb-3">
        <span className="font-semibold text-ink">
          {selectedIds.size > 0
            ? `${selectedIds.size} ${selectedIds.size === 1 ? "person" : "people"} selected`
            : "Whole team"}
        </span>{" "}
        · {scopedTasks.length} open task{scopedTasks.length === 1 ? "" : "s"}
        {scopedOverdue > 0 && (
          <span className="text-tag-pink-text font-medium"> · {scopedOverdue} overdue</span>
        )}
      </p>
      <TaskTable tasks={scopedTasks} rules={rules} identityColumn="both" />
    </div>
  );
}
