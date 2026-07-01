import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { NormalizedTask, Team, TeamMember, SlaRule } from "@/types";
import { isOpen, isBreached } from "@/lib/metrics";
import { Pill } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

export function OrgChart({
  teams,
  members,
  tasks,
  rules,
}: {
  teams: Team[];
  members: TeamMember[];
  tasks: NormalizedTask[];
  rules: SlaRule[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(teams.map((t) => t.id)));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (teams.length === 0) {
    return (
      <div className="card text-sm text-muted">
        No teams yet.{" "}
        <a href="/dashboard/settings" className="text-primary font-medium">
          Set up your org chart in Settings →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 stagger">
      {teams.map((team) => {
        const teamMembers = members.filter((m) => m.team_id === team.id);
        const teamOpenTasks = tasks.filter(
          (t) => isOpen(t) && teamMembers.some((m) => matches(m, t))
        );
        const teamBreaches = teamOpenTasks.filter((t) => isBreached(t, rules));
        const isOpenTeam = expanded.has(team.id);

        return (
          <div key={team.id} className="card">
            <button
              onClick={() => toggle(team.id)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <ChevronRight
                  size={16}
                  className={`text-muted transition-transform duration-200 ${
                    isOpenTeam ? "rotate-90" : ""
                  }`}
                />
                <h3 className="font-semibold text-lg">{team.name}</h3>
                <span className="text-xs text-muted">
                  {teamMembers.length} {teamMembers.length === 1 ? "person" : "people"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Pill tone="default">{teamOpenTasks.length} open</Pill>
                {teamBreaches.length > 0 && (
                  <Pill tone="danger">{teamBreaches.length} overdue</Pill>
                )}
              </div>
            </button>

            {isOpenTeam && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
                {teamMembers.map((m) => (
                  <MemberCard key={m.id} member={m} tasks={tasks} rules={rules} />
                ))}
                {teamMembers.length === 0 && (
                  <p className="text-sm text-muted">No members on this team yet.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function matches(member: TeamMember, task: NormalizedTask) {
  if (!member.jira_email || !task.assigneeEmail) return false;
  return member.jira_email.toLowerCase() === task.assigneeEmail.toLowerCase();
}

function MemberCard({
  member,
  tasks,
  rules,
}: {
  member: TeamMember;
  tasks: NormalizedTask[];
  rules: SlaRule[];
}) {
  const mine = tasks.filter((t) => matches(member, t));
  const open = mine.filter(isOpen);
  const breached = open.filter((t) => isBreached(t, rules));
  const noEmail = !member.jira_email;

  return (
    <div className="border border-line rounded-2xl p-4 flex flex-col gap-3 hover:shadow-cardHover transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <Avatar name={member.name || "?"} size={36} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{member.name}</p>
          <p className="text-xs text-muted truncate">{member.role || "—"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {noEmail ? (
          <Pill tone="warning">No Jira email set</Pill>
        ) : (
          <>
            <Pill tone="default">{open.length} open</Pill>
            {breached.length > 0 ? (
              <Pill tone="danger">{breached.length} overdue</Pill>
            ) : (
              <Pill tone="success">On track</Pill>
            )}
          </>
        )}
        <span className="text-xs text-muted ml-auto">
          {member.weekly_capacity_hours}h/wk
        </span>
      </div>
    </div>
  );
}
