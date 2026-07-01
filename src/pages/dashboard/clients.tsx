import { useMemo, useState } from "react";
import { Files, Building2, Layers, Star } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarList } from "@/components/charts/BarList";
import { DonutChart } from "@/components/charts/DonutChart";
import { useTasks } from "@/lib/useTasks";
import { isOpen, groupCount } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";

export default function Clients() {
  const { tasks, isLoading } = useTasks();
  const [onlyOpen, setOnlyOpen] = useState(true);

  const scoped = useMemo(
    () => (onlyOpen ? tasks.filter(isOpen) : tasks),
    [tasks, onlyOpen]
  );

  const byClient = useMemo(
    () => groupCount(scoped, (t) => t.client || "No client"),
    [scoped]
  );
  const byContentType = useMemo(
    () => groupCount(scoped, (t) => t.contentType),
    [scoped]
  );

  const matrix = useMemo(() => {
    const clients = byClient.map((c) => c.name);
    const types = byContentType.map((c) => c.name);
    const grid = clients.map((client) => {
      const row: Record<string, number | string> = { client };
      for (const type of types) {
        row[type] = scoped.filter(
          (t) => (t.client || "No client") === client && t.contentType === type
        ).length;
      }
      return row;
    });
    return { clients, types, grid };
  }, [scoped, byClient, byContentType]);

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
        title="Clients & content type"
        description="Where the work is concentrated, and what kind of work it is."
        actions={
          <label className="flex items-center gap-2 text-sm text-muted bg-white border border-line rounded-pill px-3 py-2">
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
              className="accent-primary"
            />
            Open tasks only
          </label>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger">
        <StatCard label="Tasks in view" value={scoped.length} icon={Files} gradient="violet" />
        <StatCard label="Clients" value={byClient.length} icon={Building2} gradient="orange" />
        <StatCard label="Content types" value={byContentType.length} icon={Layers} gradient="teal" />
        <StatCard
          label="Top client tasks"
          value={byClient[0]?.value ?? 0}
          icon={Star}
          gradient="pink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold mb-4">Tasks per client</h2>
          <BarList data={byClient} />
        </Card>
        <Card>
          <h2 className="font-semibold mb-4">Tasks per content type</h2>
          <DonutChart data={byContentType} />
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold mb-4">Client × content type</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-line">
                <th className="py-2 pr-4 label-caps font-normal">Client</th>
                {matrix.types.map((t) => (
                  <th key={t} className="py-2 px-3 label-caps font-normal text-right">
                    {t}
                  </th>
                ))}
                <th className="py-2 pl-3 label-caps font-normal text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {matrix.grid.map((row) => {
                const total = matrix.types.reduce(
                  (s, t) => s + Number(row[t] || 0),
                  0
                );
                return (
                  <tr key={row.client as string} className="border-b border-line/60 hover:bg-paper/60 transition-colors">
                    <td className="py-2.5 pr-4">{row.client}</td>
                    {matrix.types.map((t) => (
                      <td key={t} className="py-2.5 px-3 text-right text-ink/70">
                        {row[t] || "–"}
                      </td>
                    ))}
                    <td className="py-2.5 pl-3 text-right font-semibold">{total}</td>
                  </tr>
                );
              })}
              {matrix.grid.length === 0 && (
                <tr>
                  <td className="py-6 text-muted" colSpan={matrix.types.length + 2}>
                    No tasks in view.
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
