import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Pill } from "@/components/ui/Card";
import { PageHeader, TabButton } from "@/components/ui/PageHeader";
import { TrendLine } from "@/components/charts/TrendLine";
import { useTasks } from "@/lib/useTasks";
import { weeklyThroughput } from "@/lib/trends";
import { groupCount } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";

export default function TrendsPage() {
  const { tasks, isLoading } = useTasks();
  const [weeks, setWeeks] = useState(10);

  const data = useMemo(() => weeklyThroughput(tasks, weeks), [tasks, weeks]);
  const topClients = useMemo(
    () => groupCount(tasks, (t) => t.client || "No client").slice(0, 5),
    [tasks]
  );

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
        title="Trends"
        description="Throughput and backlog movement over time."
        actions={
          <div className="flex gap-2">
            {[6, 10, 16].map((w) => (
              <TabButton key={w} active={weeks === w} onClick={() => setWeeks(w)}>
                {w} weeks
              </TabButton>
            ))}
          </div>
        }
      />

      <Card className="mb-6">
        <h2 className="font-semibold mb-1">Created vs. completed, per week</h2>
        <p className="text-xs text-muted mb-4">
          Completed is a proxy: tasks currently marked Done, bucketed by their
          last-updated week.
        </p>
        <TrendLine data={data} series={["Created", "Completed"]} />
      </Card>

      <Card>
        <h2 className="font-semibold mb-1">Net backlog change, per week</h2>
        <p className="text-xs text-muted mb-4">
          Running total of created minus completed — trending up means the
          queue is growing faster than the team is clearing it.
        </p>
        <TrendLine data={data} series={["Net backlog change"]} />
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold mb-4">Busiest clients right now</h2>
        <div className="flex flex-wrap gap-2">
          {topClients.map((c) => (
            <Pill key={c.name} colorKey={c.name}>
              {c.name} · {c.value}
            </Pill>
          ))}
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
