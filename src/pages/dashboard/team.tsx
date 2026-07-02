import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { ListTodo, AlertTriangle, Users2, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssigneeQueue } from "@/components/team/AssigneeQueue";
import { useTasks, useTeamData, useSlaRules, useClients } from "@/lib/useTasks";
import { isOpen, isBreached, taskMatchesMember } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";

const PRIORITY_BUCKETS = ["High", "Medium", "Low"] as const;
const PRIORITY_BUCKET_COLOR: Record<string, string> = {
  High: "bg-tag-pink-text",
  Medium: "bg-tag-yellow-text",
  Low: "bg-muted",
};

function priorityBucket(priority: string | null): (typeof PRIORITY_BUCKETS)[number] | null {
  const p = (priority ?? "").toUpperCase();
  if (p.includes("HIGH")) return "High";
  if (p.includes("MED")) return "Medium";
  if (p.includes("LOW") || p.includes("MAINTENANCE")) return "Low";
  return null;
}

export default function TeamPage() {
  const { tasks, isLoading: tasksLoading } = useTasks();
  const { teams, members, isLoading: teamLoading } = useTeamData();
  const { rules, isLoading: rulesLoading } = useSlaRules();
  const { clients, isLoading: clientsLoading } = useClients();
  const [teamId, setTeamId] = useState<string>("all");
  const router = useRouter();

  // Sidebar's "Teams" list links here with ?team=<id> — land straight on
  // that team instead of resetting to "All teams" (which, before this,
  // made the by-person picker below default to whoever had the most
  // overdue work company-wide, not on the team you actually clicked).
  useEffect(() => {
    if (!router.isReady) return;
    const team = router.query.team;
    if (typeof team === "string" && team) setTeamId(team);
  }, [router.isReady, router.query.team]);

  const scopedMembers = useMemo(
    () => (teamId === "all" ? members : members.filter((m) => m.team_id === teamId)),
    [members, teamId]
  );

  const open = useMemo(() => tasks.filter(isOpen), [tasks]);

  const scopedOpen = useMemo(
    () => open.filter((t) => scopedMembers.some((m) => taskMatchesMember(t, m))),
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

  // Brand load per team — how many High/Medium/Low priority clients each
  // team is carrying, from the Brand Directory. Sorted heaviest-first so an
  // imbalance (e.g. one team carrying way more brands than the others) is
  // obvious at a glance instead of buried in per-team clicking.
  const brandLoadByTeam = useMemo(() => {
    return teams
      .map((t) => {
        const teamClients = clients.filter((c) => c.team_id === t.id);
        const counts: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
        for (const c of teamClients) {
          const bucket = priorityBucket(c.priority);
          if (bucket) counts[bucket]++;
        }
        return { team: t, counts, total: teamClients.length };
      })
      .sort((a, b) => b.total - a.total);
  }, [teams, clients]);
  const maxBrandTotal = Math.max(1, ...brandLoadByTeam.map((b) => b.total));

  if (tasksLoading || teamLoading || rulesLoading || clientsLoading) {
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
        <StatCard
          label="Open tasks"
          value={scopedOpen.length}
          icon={ListTodo}
          gradient="violet"
          href="/dashboard/status"
        />
        <StatCard
          label="Overdue"
          value={breached.length}
          icon={AlertTriangle}
          gradient="pink"
          href="/dashboard/alerts"
        />
        <StatCard
          label="People"
          value={scopedMembers.length}
          icon={Users2}
          gradient="orange"
          href="/dashboard/settings"
        />
        <StatCard
          label="Avg. queue"
          value={avgQueueDays}
          sublabel="days"
          icon={Clock}
          gradient="teal"
          href="/dashboard/queue"
        />
      </div>

      {brandLoadByTeam.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold">Brand load per team</h2>
            <div className="flex items-center gap-3 text-xs text-muted">
              {PRIORITY_BUCKETS.map((b) => (
                <span key={b} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${PRIORITY_BUCKET_COLOR[b]}`} />
                  {b}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {brandLoadByTeam.map(({ team, counts, total }) => (
              <div key={team.id} className="flex items-center gap-3 text-sm">
                <span className="w-20 truncate font-medium">{team.name}</span>
                <div className="flex-1 h-2.5 bg-line/60 rounded-full overflow-hidden flex">
                  <div
                    className="h-full flex rounded-full overflow-hidden transition-all duration-500"
                    style={{ width: `${(total / maxBrandTotal) * 100}%` }}
                  >
                    {PRIORITY_BUCKETS.map((b) => {
                      const pct = total > 0 ? (counts[b] / total) * 100 : 0;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={b}
                          className={PRIORITY_BUCKET_COLOR[b]}
                          style={{ width: `${pct}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
                <span className="w-40 text-right text-muted whitespace-nowrap">
                  {counts.High} High · {counts.Medium} Med · {counts.Low} Low
                </span>
                <span className="w-16 text-right font-semibold">{total} total</span>
              </div>
            ))}
          </div>
        </Card>
      )}

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
