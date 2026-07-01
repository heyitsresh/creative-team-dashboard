import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Building2, Users2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Pill, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useTasks, useSlaRules } from "@/lib/useTasks";
import { isOpen, isBreached, slaHoursFor } from "@/lib/metrics";
import { useAutosave } from "@/lib/useAutosave";
import { LoadingState } from "@/components/ui/LoadingState";
import { Avatar } from "@/components/ui/Avatar";

export default function AlertsPage() {
  const { tasks, isLoading } = useTasks();
  const { rules } = useSlaRules();

  const breaches = useMemo(() => {
    return tasks
      .filter((t) => isOpen(t) && isBreached(t, rules))
      .map((t) => ({
        task: t,
        budget: slaHoursFor(t, rules),
        overBy: t.hoursInQueue - slaHoursFor(t, rules),
      }))
      .sort((a, b) => b.overBy - a.overBy);
  }, [tasks, rules]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState label="Pulling from Jira…" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="SLA breach alerts"
        description="Open tasks that have blown past their turnaround SLA, worst first."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger">
        <StatCard label="Total breaches" value={breaches.length} icon={AlertTriangle} gradient="pink" />
        <StatCard
          label="Worst overage (h)"
          value={breaches[0] ? Math.round(breaches[0].overBy) : 0}
          icon={Clock}
          gradient="orange"
          href="/dashboard/queue"
        />
        <StatCard
          label="Clients affected"
          value={new Set(breaches.map((b) => b.task.client).filter(Boolean)).size}
          icon={Building2}
          gradient="violet"
          href="/dashboard/health"
        />
        <StatCard
          label="People affected"
          value={new Set(breaches.map((b) => b.task.assigneeName).filter(Boolean)).size}
          icon={Users2}
          gradient="teal"
          href="/dashboard/team"
        />
      </div>

      <div className="flex flex-col gap-3 stagger">
        {breaches.map(({ task, budget, overBy }) => (
          <AlertRow key={task.key} task={task} budget={budget} overBy={overBy} />
        ))}
        {breaches.length === 0 && (
          <Card>
            <p className="text-sm text-muted">Nothing breached — the queue is within SLA.</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function AlertRow({
  task,
  budget,
  overBy,
}: {
  task: ReturnType<typeof useTasks>["tasks"][number];
  budget: number;
  overBy: number;
}) {
  const [note, setNote] = useState("");
  const { save, state } = useAutosave<{ issue_key: string; note: string }>("/api/notes", {});

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex items-start gap-3">
          {task.assigneeEmail ? (
            <Link href={`/dashboard/queue?person=${encodeURIComponent(task.assigneeEmail)}`}>
              <Avatar name={task.assigneeName || "?"} src={task.assigneeAvatarUrl} size={32} />
            </Link>
          ) : (
            task.assigneeName && <Avatar name={task.assigneeName} size={32} />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <a
                href={task.webUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold text-sm"
              >
                {task.key}
              </a>
              <Pill tone="danger">{Math.round(overBy)}h over</Pill>
              <Pill colorKey={task.contentType}>{task.contentType}</Pill>
            </div>
            <p className="text-sm truncate">{task.summary}</p>
            <p className="text-xs text-muted mt-1">
              {task.client ? (
                <Link
                  href={`/dashboard/health?client=${encodeURIComponent(task.client)}`}
                  className="hover:text-primary hover:underline transition-colors"
                >
                  {task.client}
                </Link>
              ) : (
                "No client"
              )}{" "}
              ·{" "}
              {task.assigneeEmail ? (
                <Link
                  href={`/dashboard/queue?person=${encodeURIComponent(task.assigneeEmail)}`}
                  className="hover:text-primary hover:underline transition-colors"
                >
                  {task.assigneeName || task.assigneeEmail}
                </Link>
              ) : (
                task.assigneeName || "Unassigned"
              )}{" "}
              · budget {Math.round(budget)}h, currently at {Math.round(task.hoursInQueue)}h
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 w-full sm:w-64">
          <input
            placeholder="Add a note…"
            defaultValue={note}
            onChange={(e) => {
              setNote(e.target.value);
              save({ issue_key: task.key, note: e.target.value });
            }}
            className="w-full border border-line rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
          />
          <span className="text-[11px] text-muted">
            {state === "saving" && "Saving…"}
            {state === "saved" && "Saved"}
          </span>
        </div>
      </div>
    </Card>
  );
}

// Forces this page to render per-request instead of being statically
// prerendered at build time — it needs a live Supabase session, and static
// generation would try (and fail) to construct the Supabase client without
// a request context.
export async function getServerSideProps() {
  return { props: {} };
}
