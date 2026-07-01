import Link from "next/link";
import { ListTodo, AlertTriangle, Users2, Layers } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarList } from "@/components/charts/BarList";
import { DonutChart } from "@/components/charts/DonutChart";
import { useTasks, useSlaRules } from "@/lib/useTasks";
import { isOpen, isBreached, groupCount } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";

export default function Overview() {
  const { tasks, isLoading } = useTasks();
  const { rules } = useSlaRules();

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

  return (
    <DashboardLayout>
      <PageHeader
        title="Overview"
        description="Live snapshot of everything in the creative queue."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard label="Open tasks" value={open.length} icon={ListTodo} gradient="violet" />
        <StatCard
          label="SLA breaches"
          value={breached.length}
          icon={AlertTriangle}
          gradient="pink"
        />
        <StatCard label="Clients in queue" value={byClient.length} icon={Users2} gradient="orange" />
        <StatCard label="Content types" value={byContentType.length} icon={Layers} gradient="teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold mb-4">Open tasks by client</h2>
          <BarList data={byClient} max={8} />
          <Link
            href="/dashboard/clients"
            className="inline-block mt-4 text-sm text-primary font-medium"
          >
            View full client breakdown →
          </Link>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4">Content type mix</h2>
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
          <p className="text-sm text-muted">
            Drill into open-task load per team and per person.
          </p>
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
