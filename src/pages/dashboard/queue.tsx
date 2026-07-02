import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Pill } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useTasks, useTeamData, useSlaRules } from "@/lib/useTasks";
import { isOpen, isBreached, slaHoursFor, standardHoursFor } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";
import { Avatar } from "@/components/ui/Avatar";
import type { NormalizedTask, TeamMember } from "@/types";

// Open tasks only ever land in these two status categories — "done" is
// excluded from "open" by definition. Colors intentionally echo the Kanban
// board so a bar segment and a board column read the same way.
const CATEGORY_ORDER: Array<"new" | "indeterminate"> = ["new", "indeterminate"];
const CATEGORY_BAR_COLOR: Record<string, string> = {
  new: "bg-muted",
  indeterminate: "bg-primary",
};
const CATEGORY_LEGEND_LABEL: Record<string, string> = {
  new: "To do",
  indeterminate: "In progress",
};

export default function QueuePage() {
  const { tasks, isLoading: tasksLoading } = useTasks();
  const { members, isLoading: teamLoading } = useTeamData();
  const { rules, isLoading: rulesLoading } = useSlaRules();
  const router = useRouter();

  // Arriving from an avatar click elsewhere (Overview's "Team" card, an org
  // chart member, etc.) scopes this page to just that person via
  // ?person=<jira_email> instead of showing the whole team's workload.
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  useEffect(() => {
    if (!router.isReady) return;
    const person = router.query.person;
    setPersonFilter(typeof person === "string" && person ? person.toLowerCase() : null);
  }, [router.isReady, router.query.person]);

  const open = useMemo(() => tasks.filter(isOpen), [tasks]);

  const workload = useMemo(() => {
    return members
      .map((m: TeamMember) => {
        const mine = open.filter(
          (t: NormalizedTask) =>
            m.jira_email && t.assigneeEmail?.toLowerCase() === m.jira_email.toLowerCase()
        );
        const estimatedHours = mine.reduce((s, t) => s + standardHoursFor(t, rules), 0);
        const weeklyCapacity = m.weekly_capacity_hours || 40;
        const overdueCount = mine.filter((t) => isBreached(t, rules)).length;
        const hoursByCategory: Record<string, number> = {};
        for (const t of mine) {
          hoursByCategory[t.statusCategory] =
            (hoursByCategory[t.statusCategory] || 0) + standardHoursFor(t, rules);
        }
        return {
          member: m,
          taskCount: mine.length,
          estimatedHours,
          weeklyCapacity,
          utilization: weeklyCapacity > 0 ? estimatedHours / weeklyCapacity : 0,
          overdueCount,
          hoursByCategory,
        };
      })
      .sort((a, b) => b.utilization - a.utilization);
  }, [members, open, rules]);

  const filteredMember = personFilter
    ? members.find((m) => m.jira_email?.toLowerCase() === personFilter)
    : null;

  const scopedOpen = useMemo(
    () =>
      personFilter
        ? open.filter((t) => t.assigneeEmail?.toLowerCase() === personFilter)
        : open,
    [open, personFilter]
  );

  const queueRows = useMemo(() => {
    return [...scopedOpen]
      .map((t) => ({
        task: t,
        budget: slaHoursFor(t, rules),
        pctOfBudget: slaHoursFor(t, rules) > 0 ? t.hoursInQueue / slaHoursFor(t, rules) : 0,
      }))
      .sort((a, b) => b.pctOfBudget - a.pctOfBudget)
      // Capped at 40 for the "everyone" view (otherwise it's an unreadable
      // wall of rows), but once scoped to one person via ?person=, show
      // every one of their tasks — not just their worst-offending 40.
      .slice(0, personFilter ? undefined : 40);
  }, [scopedOpen, rules, personFilter]);

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
        title="Queue time vs. SLA"
        description="Standard labor-hours (open tasks × content-type effort) against each person's weekly capacity, plus how long individual tasks have sat relative to their turnaround SLA. Both hour figures are set per content type in Settings."
      />

      {personFilter && (
        <div className="flex items-center gap-2 mb-6 -mt-2">
          <span className="text-sm text-muted">Viewing:</span>
          <span className="pill bg-primary-light text-primary flex items-center gap-2">
            <Avatar name={filteredMember?.name || personFilter} size={16} />
            {filteredMember?.name || personFilter}
            <Link
              href="/dashboard/queue"
              className="hover:text-tag-pink-text transition-colors"
              aria-label="Clear filter"
            >
              <X size={12} />
            </Link>
          </span>
        </div>
      )}

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold">Workload vs. available time, per person</h2>
          <div className="flex items-center gap-4 text-xs text-muted">
            {CATEGORY_ORDER.map((cat) => (
              <span key={cat} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${CATEGORY_BAR_COLOR[cat]}`} />
                {CATEGORY_LEGEND_LABEL[cat]}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-tag-pink-text" />
              Overdue (of the above)
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1 stagger">
          {workload.map(
            ({
              member,
              taskCount,
              estimatedHours,
              weeklyCapacity,
              utilization,
              overdueCount,
              hoursByCategory,
            }) => {
              const isActive = personFilter && member.jira_email?.toLowerCase() === personFilter;
              const barWidth = Math.min(100, utilization * 100);
              return (
                <Link
                  key={member.id}
                  href={
                    isActive
                      ? "/dashboard/queue"
                      : `/dashboard/queue?person=${encodeURIComponent(member.jira_email || "")}`
                  }
                  className={`flex items-center gap-3 text-sm -mx-2 px-2 py-2 rounded-lg transition-colors duration-150 ${
                    isActive ? "bg-primary-light" : "hover:bg-paper/70"
                  } ${member.jira_email ? "" : "pointer-events-none opacity-60"}`}
                >
                  <Avatar name={member.name} size={26} />
                  <span className="w-32 truncate">{member.name}</span>
                  <div className="flex-1 h-2.5 bg-line/60 rounded-full overflow-hidden flex">
                    <div
                      className="h-full flex rounded-full overflow-hidden transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    >
                      {CATEGORY_ORDER.map((cat) => {
                        const catHours = hoursByCategory[cat] || 0;
                        const pct = estimatedHours > 0 ? (catHours / estimatedHours) * 100 : 0;
                        if (pct <= 0) return null;
                        return (
                          <div
                            key={cat}
                            className={CATEGORY_BAR_COLOR[cat]}
                            style={{ width: `${pct}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <span className="w-48 text-right text-muted flex items-center justify-end gap-1.5">
                    <span className="whitespace-nowrap">
                      {Math.round(estimatedHours)}h / {weeklyCapacity}h ({taskCount})
                    </span>
                    {overdueCount > 0 && (
                      <span className="shrink-0 rounded-full bg-tag-pink-bg text-tag-pink-text text-[10px] font-semibold px-1.5 py-0.5 whitespace-nowrap">
                        {overdueCount} overdue
                      </span>
                    )}
                  </span>
                </Link>
              );
            }
          )}
          {workload.length === 0 && (
            <p className="text-sm text-muted">
              No team members yet — add your roster in Settings to see workload here.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold mb-4">
          {personFilter
            ? `${filteredMember?.name || "This person"}'s tasks closest to (or past) SLA`
            : "Tasks closest to (or past) SLA"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-line label-caps font-normal">
                <th className="py-2 pr-3">Task</th>
                <th className="py-2 px-3">Client</th>
                <th className="py-2 px-3">Content type</th>
                <th className="py-2 px-3">Assignee</th>
                <th className="py-2 px-3 text-right">In queue</th>
                <th className="py-2 pl-3 text-right">vs. budget</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.map(({ task, budget, pctOfBudget }) => (
                <tr key={task.key} className="border-b border-line/60 hover:bg-paper/60 transition-colors">
                  <td className="py-2.5 pr-3">
                    <a
                      href={task.webUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-medium"
                    >
                      {task.key}
                    </a>
                    <p className="text-xs text-muted truncate max-w-xs">{task.summary}</p>
                  </td>
                  <td className="py-2.5 px-3 text-ink/70">
                    {task.client ? (
                      <Link
                        href={`/dashboard/health?client=${encodeURIComponent(task.client)}`}
                        className="hover:text-primary hover:underline transition-colors"
                      >
                        {task.client}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <Pill colorKey={task.contentType}>{task.contentType}</Pill>
                  </td>
                  <td className="py-2.5 px-3 text-ink/70">
                    {task.assigneeEmail ? (
                      <Link
                        href={`/dashboard/queue?person=${encodeURIComponent(task.assigneeEmail)}`}
                        className="hover:text-primary hover:underline transition-colors"
                      >
                        {task.assigneeName || task.assigneeEmail}
                      </Link>
                    ) : (
                      task.assigneeName || "Unassigned"
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {Math.round(task.hoursInQueue)}h / {Math.round(budget)}h
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <Pill tone={pctOfBudget > 1 ? "danger" : pctOfBudget > 0.75 ? "warning" : "success"}>
                      {Math.round(pctOfBudget * 100)}%
                    </Pill>
                  </td>
                </tr>
              ))}
              {queueRows.length === 0 && (
                <tr>
                  <td className="py-6 text-muted" colSpan={6}>
                    No open tasks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
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
