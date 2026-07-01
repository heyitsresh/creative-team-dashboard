import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Pill } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { CountUp } from "@/components/ui/CountUp";
import { useTasks, useSlaRules } from "@/lib/useTasks";
import { isOpen, isBreached, groupCount } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ClientHealthPage() {
  const { tasks, isLoading } = useTasks();
  const { rules } = useSlaRules();
  const [query, setQuery] = useState("");

  const clients = useMemo(() => {
    const names = Array.from(
      new Set(tasks.map((t) => t.client).filter(Boolean) as string[])
    );
    return names
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
  }, [tasks, rules, query]);

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
        title="Client health"
        description="One quick-scan card per client."
        actions={
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Filter clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border border-line rounded-pill pl-9 pr-4 py-2 text-sm bg-white w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
        {clients.map((c) => (
          <Card key={c.client}>
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
