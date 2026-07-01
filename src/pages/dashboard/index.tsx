import Link from "next/link";
import { ListTodo, AlertTriangle, Users2, Layers, ArrowUpRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarList } from "@/components/charts/BarList";
import { DonutChart } from "@/components/charts/DonutChart";
import { Avatar } from "@/components/ui/Avatar";
import { useTasks, useSlaRules, useTeamData } from "@/lib/useTasks";
import { isOpen, isBreached, groupCount } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";
import type { NormalizedTask, TeamMember } from "@/types";

function matches(member: TeamMember, task: NormalizedTask) {
  if (!member.jira_email || !task.assigneeEmail) return false;
  return member.jira_email.toLowerCase() === task.assigneeEmail.toLowerCase();
}

export default function Overview() {
  const { tasks, isLoading } = useTasks();
  const { rules } = useSlaRules();
  const { members } = useTeamData();

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState label="Pulling from Jira…" />
      </DashboardLayout>
    );
  }

  const open = tasks.filter(isOpen);
  const breached = open.filter((t) => isBreached(t, rules));
  const byClient = groupCount(open, (t) => t.client || "No client");
  const byContentType = groupCount(open, (t) => t.contentType);

  // Top few people by open-task load, with their real Jira photo when we
  // have one — click one to jump straight to their slice of the queue.
  const peopleByLoad = members
    .map((m) => {
      const mine = open.filter((t) => matches(m, t));
      return {
        member: m,
        count: mine.length,
        avatarUrl: mine.find((t) => t.assigneeAvatarUrl)?.assigneeAvatarUrl,
      };
    })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <DashboardLayout>
      <PageHeader
        title="Overview"
        description="Live snapshot of everything in the creative queue."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard
          label="Open tasks"
          value={open.length}
          icon={ListTodo}
          gradient="violet"
          href="/dashboard/status"
        />
        <StatCard
          label="SLA breaches"
          value={breached.length}
          icon={AlertTriangle}
          gradient="pink"
          href="/dashboard/alerts"
        />
        <StatCard
          label="Clients in queue"
          value={byClient.length}
          icon={Users2}
          gradient="orange"
          href="/dashboard/clients"
        />
        <StatCard
          label="Content types"
          value={byContentType.length}
          icon={Layers}
          gradient="teal"
          href="/dashboard/clients"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Open tasks by client</h2>
            <Link
              href="/dashboard/clients"
              className="text-muted hover:text-primary hover:bg-primary-light rounded-lg p-1.5 transition-colors"
              title="View full client breakdown"
            >
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <BarList
            data={byClient}
            max={8}
            getHref={(d) => `/dashboard/health?client=${encodeURIComponent(d.name)}`}
          />
          <Link
            href="/dashboard/clients"
            className="inline-block mt-4 text-sm text-primary font-medium"
          >
            View full client breakdown →
          </Link>
        </Card>

        <Card className="relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Content type mix</h2>
            <Link
              href="/dashboard/clients"
              className="text-muted hover:text-primary hover:bg-primary-light rounded-lg p-1.5 transition-colors"
              title="View content type breakdown"
            >
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <DonutChart data={byContentType} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Team</h2>
            <Link href="/dashboard/team" className="text-sm text-primary font-medium">
              Org chart →
            </Link>
          </div>
          {peopleByLoad.length > 0 ? (
            <>
              <p className="text-sm text-muted mb-4">
                Busiest right now — click anyone to jump to their queue.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                {peopleByLoad.map(({ member, count, avatarUrl }) => (
                  <Link
                    key={member.id}
                    href={`/dashboard/queue?person=${encodeURIComponent(member.jira_email || "")}`}
                    className="btn-press flex flex-col items-center gap-1.5 w-16 group"
                  >
                    <div className="relative transition-transform duration-150 group-hover:-translate-y-0.5">
                      <Avatar name={member.name} src={avatarUrl} size={40} />
                      <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-primary ring-2 ring-white">
                        {count}
                      </span>
                    </div>
                    <span className="text-xs text-ink/70 truncate w-full text-center group-hover:text-primary transition-colors">
                      {member.name.split(" ")[0]}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">
              Drill into open-task load per team and per person.
            </p>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Queue time vs. SLA</h2>
            <Link href="/dashboard/queue" className="text-sm text-primary font-medium">
              View →
            </Link>
          </div>
          <p className="text-sm text-muted">
            Time-in-queue per task against each person&apos;s available capacity.
          </p>
        </Card>
      </div>
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
