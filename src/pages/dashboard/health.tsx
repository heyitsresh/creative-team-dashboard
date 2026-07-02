import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Search, X, ArrowLeft, Files, AlertTriangle, Layers, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Pill, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { CountUp } from "@/components/ui/CountUp";
import { TaskTable } from "@/components/shared/TaskTable";
import { Avatar } from "@/components/ui/Avatar";
import { useTasks, useSlaRules, useTeamData } from "@/lib/useTasks";
import { isOpen, isBreached, groupCount } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ClientHealthPage() {
  const { tasks, isLoading } = useTasks();
  const { rules } = useSlaRules();
  const { teams, members, isLoading: teamLoading } = useTeamData();
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const router = useRouter();

  // Arriving from a "drill into this client" link (e.g. the client bar list
  // on Overview/Clients) pre-fills the filter with ?client=<name> so this
  // page lands scoped to that one client instead of showing everyone.
  useEffect(() => {
    if (!router.isReady) return;
    const client = router.query.client;
    if (typeof client === "string" && client) setQuery(client);
  }, [router.isReady, router.query.client]);

  const allClientNames = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.client).filter(Boolean) as string[])),
    [tasks]
  );

  // An exact (not just substring) match means we arrived via a click-through
  // link rather than someone typing a partial search — so instead of the
  // filtered grid, show a full per-client detail view: KPI headers plus a
  // real hyperlinked task table, one client, line by line.
  const exactClient = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return allClientNames.find((c) => c.toLowerCase() === q) ?? null;
  }, [allClientNames, query]);

  const clients = useMemo(() => {
    return allClientNames
      .map((client) => {
        const clientTasks = tasks.filter((t) => t.client === client);
        const open = clientTasks.filter(isOpen);
        const breached = open.filter((t) => isBreached(t, rules));
        const contentMix = groupCount(open, (t) => t.contentType);
        const avgQueue =
          open.length > 0
            ? Math.round(open.reduce((s, t) => s + t.hoursInQueue, 0) / open.length)
            : 0;
        return { client, open, breached, contentMix, avgQueue, total: clientTasks.length };
      })
      .filter((c) => c.client.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.open.length - a.open.length);
  }, [allClientNames, tasks, rules, query]);

  if (isLoading || teamLoading) {
    return (
      <DashboardLayout>
        <LoadingState label="Pulling from Jira…" />
      </DashboardLayout>
    );
  }

  if (exactClient) {
    const clientTasks = tasks.filter((t) => t.client === exactClient);
    const scoped = onlyOpen ? clientTasks.filter(isOpen) : clientTasks;
    const openTasks = clientTasks.filter(isOpen);
    const breached = openTasks.filter((t) => isBreached(t, rules));
    const contentTypes = groupCount(openTasks, (t) => t.contentType);
    const avgQueueDays = openTasks.length
      ? Math.round(openTasks.reduce((s, t) => s + t.hoursInQueue, 0) / openTasks.length / 24)
      : 0;

    // First figure out which team(s) actually have a ticket on this client
    // — then show that team's FULL roster (creative manager, listing
    // specialist, designer, video editor, everyone), not just whoever
    // happens to already have a Jira task here. A designer with 0 tasks on
    // this client yet is still "the designer for this client."
    const teamIdsWithWork = new Set(
      members
        .filter((m) =>
          clientTasks.some(
            (t) => m.jira_email && t.assigneeEmail?.toLowerCase() === m.jira_email.toLowerCase()
          )
        )
        .map((m) => m.team_id)
        .filter(Boolean)
    );
    const teamsOnClient = teams.filter((t) => teamIdsWithWork.has(t.id));
    const peopleOnClient = members
      .filter((m) => teamIdsWithWork.has(m.team_id))
      .map((m) => {
        const mine = clientTasks.filter(
          (t) => m.jira_email && t.assigneeEmail?.toLowerCase() === m.jira_email.toLowerCase()
        );
        const openMine = mine.filter(isOpen);
        return {
          member: m,
          count: mine.length,
          openCount: openMine.length,
          avatarUrl: mine.find((t) => t.assigneeAvatarUrl)?.assigneeAvatarUrl,
        };
      })
      .sort((a, b) => b.count - a.count || a.member.sort_order - b.member.sort_order);

    return (
      <DashboardLayout>
        <PageHeader
          title={exactClient}
          description={`${clientTasks.length} task${clientTasks.length === 1 ? "" : "s"} tracked for this client.`}
          actions={
            <Link
              href="/dashboard/health"
              className="btn-press flex items-center gap-1.5 text-sm bg-white border border-line rounded-pill px-4 py-2 font-medium text-ink hover:bg-primary-light transition"
            >
              <ArrowLeft size={14} /> All clients
            </Link>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger">
          <StatCard
            label="Open tasks"
            value={openTasks.length}
            icon={Files}
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
            label="Content types"
            value={contentTypes.length}
            icon={Layers}
            gradient="orange"
            href="/dashboard/clients"
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

        {peopleOnClient.length > 0 && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold">Team on this client</h2>
              {teamsOnClient.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {teamsOnClient.map((t) => (
                    <Pill key={t.id} colorKey={t.name}>
                      {t.name}
                    </Pill>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {peopleOnClient.map(({ member, count, openCount, avatarUrl }) => (
                <Link
                  key={member.id}
                  href={`/dashboard/queue?person=${encodeURIComponent(member.jira_email || "")}`}
                  className="btn-press flex flex-col items-center gap-1.5 w-20 group"
                >
                  <div className="relative transition-transform duration-150 group-hover:-translate-y-0.5">
                    <Avatar name={member.name} src={avatarUrl} size={40} />
                    <span
                      className={`absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ring-2 ring-white ${
                        openCount > 0 ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <span className="text-xs text-ink/70 truncate w-full text-center group-hover:text-primary transition-colors">
                    {member.name.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-muted truncate w-full text-center">
                    {member.role || "—"}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Tasks</h2>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
                className="accent-primary"
              />
              Open tasks only
            </label>
          </div>
          <TaskTable tasks={scoped} rules={rules} identityColumn="assignee" />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Client health"
        description="One quick-scan card per client — click one for the full task list."
        actions={
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Filter clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border border-line rounded-pill pl-9 pr-4 py-2 text-sm bg-white w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                aria-label="Clear filter"
              >
                <X size={14} />
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
        {clients.map((c) => (
          <Link
            key={c.client}
            href={`/dashboard/health?client=${encodeURIComponent(c.client)}`}
            className="block"
          >
            <Card className="h-full cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-cardHover">
              <div className="flex items-start justify-between mb-3 gap-2">
                <h3 className="font-semibold text-sm leading-snug">{c.client}</h3>
                {c.breached.length > 0 ? (
                  <Pill tone="danger">{c.breached.length} overdue</Pill>
                ) : (
                  <Pill tone="success">Healthy</Pill>
                )}
              </div>
              <div className="flex items-baseline gap-5 mb-3">
                <div>
                  <p className="text-2xl font-bold">
                    <CountUp value={c.open.length} />
                  </p>
                  <p className="label-caps">Open</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink/70">
                    <CountUp value={c.avgQueue} suffix="h" />
                  </p>
                  <p className="label-caps">Avg. queue</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.contentMix.slice(0, 4).map((m) => (
                  <Pill key={m.name} colorKey={m.name}>
                    {m.name} · {m.value}
                  </Pill>
                ))}
              </div>
            </Card>
          </Link>
        ))}
        {clients.length === 0 && (
          <p className="text-sm text-muted">No clients match.</p>
        )}
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
