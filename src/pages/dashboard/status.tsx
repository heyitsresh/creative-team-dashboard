import { useMemo, useState } from "react";
import { LayoutGrid, KanbanSquare } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, StatCard, Pill } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarList } from "@/components/charts/BarList";
import { DonutChart } from "@/components/charts/DonutChart";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useTasks, useSlaRules } from "@/lib/useTasks";
import { groupCount } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";
import type { StatusCategory } from "@/types";

const CATEGORY_LABEL: Record<StatusCategory, string> = {
  new: "To do",
  indeterminate: "In progress",
  done: "Done",
};

export default function StatusPage() {
  const { tasks, isLoading } = useTasks();
  const { rules } = useSlaRules();
  const [view, setView] = useState<"board" | "chart">("board");

  const byStatus = useMemo(() => groupCount(tasks, (t) => t.status), [tasks]);
  const byCategory = useMemo(
    () => groupCount(tasks, (t) => CATEGORY_LABEL[t.statusCategory]),
    [tasks]
  );
  const byProject = useMemo(() => groupCount(tasks, (t) => t.projectKey), [tasks]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState label="Pulling from Jira…" />
      </DashboardLayout>
    );
  }

  const total = tasks.length || 1;

  return (
    <DashboardLayout>
      <PageHeader
        title="Task status"
        description="Where everything sits in the workflow right now."
        actions={
          <div className="flex items-center gap-1 bg-white border border-line rounded-pill p-1">
            <button
              onClick={() => setView("board")}
              className={`btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
                view === "board" ? "bg-primary text-white" : "text-muted hover:text-ink"
              }`}
            >
              <KanbanSquare size={13} /> Board
            </button>
            <button
              onClick={() => setView("chart")}
              className={`btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
                view === "chart" ? "bg-primary text-white" : "text-muted hover:text-ink"
              }`}
            >
              <LayoutGrid size={13} /> Charts
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {byCategory.map((c) => (
          <StatCard
            key={c.name}
            label={c.name}
            value={c.value}
            sublabel={`${Math.round((c.value / total) * 100)}% of all tasks`}
          />
        ))}
      </div>

      {view === "board" ? (
        <KanbanBoard tasks={tasks} rules={rules} />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <h2 className="font-semibold mb-4">Tasks per status</h2>
              <BarList data={byStatus} />
            </Card>
            <Card>
              <h2 className="font-semibold mb-4">Status category</h2>
              <DonutChart data={byCategory} />
            </Card>
          </div>

          <Card className="mt-6">
            <h2 className="font-semibold mb-4">By Jira project</h2>
            <div className="flex flex-wrap gap-2">
              {byProject.map((p) => (
                <Pill key={p.name} colorKey={p.name}>
                  {p.name} · {p.value}
                </Pill>
              ))}
            </div>
          </Card>
        </>
      )}
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
