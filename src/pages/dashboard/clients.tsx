import { useMemo, useState } from "react";
import Link from "next/link";
import { Files, Building2, Layers, Star } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarList } from "@/components/charts/BarList";
import { DonutChart } from "@/components/charts/DonutChart";
import { useTasks } from "@/lib/useTasks";
import { isOpen, groupCount } from "@/lib/metrics";
import { statusDotColor } from "@/lib/taskDisplay";
import { LoadingState } from "@/components/ui/LoadingState";

export default function Clients() {
  const { tasks, isLoading } = useTasks();
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [donutClient, setDonutClient] = useState<string>("all");

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
  // Scoped down to one client for the donut when picked — lets you see
  // "what kind of work is this client's queue made of" without leaving the
  // page or losing the company-wide chart on the left.
  const byContentTypeForClient = useMemo(() => {
    if (donutClient === "all") return byContentType;
    return groupCount(
      scoped.filter((t) => (t.client || "No client") === donutClient),
      (t) => t.contentType
    );
  }, [scoped, byContentType, donutClient]);

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
    const gridMax = Math.max(
      1,
      ...grid.flatMap((row) => types.map((t) => Number(row[t] || 0)))
    );
    return { clients, types, grid, gridMax };
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
        <StatCard label="Tasks in view" value={scoped.length} icon={Files} gradient="violet" href="/dashboard/status" />
        <StatCard label="Clients" value={byClient.length} icon={Building2} gradient="orange" href="/dashboard/health" />
        <StatCard label="Content types" value={byContentType.length} icon={Layers} gradient="teal" />
        <StatCard
          label="Top client tasks"
          value={byClient[0]?.value ?? 0}
          icon={Star}
          gradient="pink"
          href={
            byClient[0]
              ? `/dashboard/health?client=${encodeURIComponent(byClient[0].name)}`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold mb-4">Tasks per client</h2>
          <BarList
            data={byClient}
            getHref={(d) => `/dashboard/health?client=${encodeURIComponent(d.name)}`}
          />
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h2 className="font-semibold">Tasks per content type</h2>
            <select
              value={donutClient}
              onChange={(e) => setDonutClient(e.target.value)}
              className="border border-line rounded-pill pl-3 pr-7 py-1.5 text-xs bg-white font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition cursor-pointer max-w-[140px]"
            >
              <option value="all">All clients</option>
              {byClient.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {donutClient !== "all" && (
            <p className="text-xs text-muted -mt-2 mb-3">
              Showing {donutClient} only ·{" "}
              <button
                onClick={() => setDonutClient("all")}
                className="text-primary font-medium hover:underline"
              >
                Clear
              </button>
            </p>
          )}
          <DonutChart data={byContentTypeForClient} />
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold">Client × content type</h2>
          <span className="text-xs text-muted">Darker = more tasks</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left">
                <th className="py-2.5 pr-4 label-caps font-normal sticky left-0 bg-white">
                  Client
                </th>
                {matrix.types.map((t) => (
                  <th key={t} className="py-2.5 px-3 label-caps font-normal text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: statusDotColor(t) }}
                      />
                      {t}
                    </span>
                  </th>
                ))}
                <th className="py-2.5 pl-3 label-caps font-normal text-right sticky right-0 bg-white">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {matrix.grid.map((row, i) => {
                const total = matrix.types.reduce(
                  (s, t) => s + Number(row[t] || 0),
                  0
                );
                return (
                  <tr
                    key={row.client as string}
                    className={i % 2 === 1 ? "bg-paper/40" : ""}
                  >
                    <td className="py-2.5 pr-4 border-t border-line/60 sticky left-0 bg-inherit">
                      <Link
                        href={`/dashboard/health?client=${encodeURIComponent(row.client as string)}`}
                        className="font-medium hover:text-primary hover:underline transition-colors whitespace-nowrap"
                      >
                        {row.client}
                      </Link>
                    </td>
                    {matrix.types.map((t) => {
                      const value = Number(row[t] || 0);
                      const intensity = value / matrix.gridMax;
                      return (
                        <td
                          key={t}
                          className="py-2.5 px-3 text-right border-t border-line/60 transition-colors"
                          style={
                            value > 0
                              ? { backgroundColor: `rgba(108, 92, 231, ${0.08 + intensity * 0.32})` }
                              : undefined
                          }
                        >
                          <span
                            className={
                              value > 0
                                ? intensity > 0.5
                                  ? "font-semibold text-primary-dark"
                                  : "font-medium text-ink/80"
                                : "text-ink/25"
                            }
                          >
                            {value || "–"}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-2.5 pl-3 text-right font-semibold border-t border-line/60 sticky right-0 bg-inherit">
                      {total}
                    </td>
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
