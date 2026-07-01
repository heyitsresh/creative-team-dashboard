import { useMemo, useState } from "react";
import { ListTodo, AlertTriangle, Users2, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssigneeQueue } from "@/components/team/AssigneeQueue";
import { useTasks, useTeamData, useSlaRules } from "@/lib/useTasks";
import { isOpen, isBreached } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";
import type { NormalizedTask, TeamMember } from "@/types";

function matches(member: TeamMember, task: NormalizedTask) {
  if (!member.jira_email || !task.assigneeEmail) return false;
  return member.jira_email.toLowerCase() === task.assigneeEmail.toLowerCase();
}

export default function TeamPage() {
  const { tasks, isLoading: tasksLoading } = useTasks();
  const { teams, members, isLoading: teamLoading } = useTeamData();
  const { rules, isLoading: rulesLoading } = useSlaRules();
  const [teamId, setTeamId] = useState<string>("all");

  const scopedMembers = useMemo(
    () => (teamId === "all" ? members : members.filter((m) => m.team_id === teamId)),
    [members, teamId]
  );

  const open = useMemo(() => tasks.filter(isOpen), [tasks]);

  const scopedOpen = useMemo(
    () => open.filter((t) => scopedMembers.some((m) => matches(m, t))),
    [open, scopedMembers]
  );

  const breached = useMemo(
    () => scopedOpen.filter((t) => isBreached(t, rules)),
    [scopedOpen, rules]
  );

  const avgQueueDays = scopedOpen.length
    ? Math.round(
        scopedOpen.reduce((s, t) => s + t.hoursInQueue, 0) / scopedOpen.length / 24
      )
    : 0;

  if (tasksLoading || teamLoading || rulesLoading) {
    return (
      <DashboardLayout>
        <LoadingState />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Team"
        description="Pick a team, then a person, to see exactly what's on their plate."
        actions={
          <a
            href="/dashboard/settings"
            className="btn-press text-sm bg-white border border-line rounded-pill px-4 py-2 font-medium text-ink hover:bg-primary-light transition"
          >
            Edit org chart
          </a>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <label htmlFor="team-select" className="label-caps">
          Team
        </label>
        <select
          id="team-select"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="border border-line rounded-pill pl-4 pr-9 py-2 text-sm bg-white font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition cursor-pointer"
        >
          <option value="all">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger">
        <StatCard label="Open tasks" value={scopedOpen.length} icon={ListTodo} gradient="violet" />
        <StatCard
          label="Overdue"
          value={breached.length}
          icon={AlertTriangle}
          gradient="pink"
          href="/dashboard/alerts"
        />
        <StatCard label="People" value={scopedMembers.length} icon={Users2} gradient="orange" />
        <StatCard
          label="Avg. queue"
          value={avgQueueDays}
          sublabel="days"
          icon={Clock}
          gradient="teal"
          href="/dashboard/queue"
        />
      </div>

      <AssigneeQueue members={scopedMembers} tasks={open} rules={rules} />
    </DashboardLayout>
  );
}

// Forces this page to render per-request instead of being statically
// prerendered at build time — it needs a live Supabase session, and static
// generation would try (and fail) to construct the Supabase client without
// a request context.
export async function getServerSideProps() {
  return { props: {} };
}
