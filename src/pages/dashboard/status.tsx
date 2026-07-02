import { useMemo, useState } from "react";
import { LayoutGrid, KanbanSquare, List, Search, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, StatCard, Pill } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarList } from "@/components/charts/BarList";
import { DonutChart } from "@/components/charts/DonutChart";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskTable } from "@/components/shared/TaskTable";
import { useTasks, useSlaRules } from "@/lib/useTasks";
import { isOpen, groupCount } from "@/lib/metrics";
import { LoadingState } from "@/components/ui/LoadingState";
import type { StatusCategory } from "@/types";

const CATEGORY_LABEL: Record<StatusCategory, string> = {
  new: "To do",
  indeterminate: "In progress",
  done: "Done",
};

const ALL = "all";

export default function StatusPage() {
  const { tasks, isLoading } = useTasks();
  const { rules } = useSlaRules();
  const [view, setView] = useState<"board" | "chart" | "list">("board");

  // List-view filters — a plain "our own Jira list view" instead of the
  // kanban, with the same toggles you'd reach for in Jira: search, status,
  // content type, assignee, open-only.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState(ALL);
  const [openOnly, setOpenOnly] = useState(false);

  const byStatus = useMemo(() => groupCount(tasks, (t) => t.status), [tasks]);
  const byCategory = useMemo(
    () => groupCount(tasks, (t) => CATEGORY_LABEL[t.statusCategory]),
    [tasks]
  );
  const byProject = useMemo(() => groupCount(tasks, (t) => t.projectKey), [tasks]);

  const statusOptions = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.status))).sort(),
    [tasks]
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.contentType))).sort(),
    [tasks]
  );
  const assigneeOptions = useMemo(
    () =>
      Array.from(new Set(tasks.map((t) => t.assigneeName).filter(Boolean) as string[])).sort(),
    [tasks]
  );

  const filtersActive =
    search.trim() !== "" ||
    statusFilter !== ALL ||
    typeFilter !== ALL ||
    assigneeFilter !== ALL ||
    openOnly;

  const listRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (openOnly && !isOpen(t)) return false;
      if (statusFilter !== ALL && t.status !== statusFilter) return false;
      if (typeFilter !== ALL && t.contentType !== typeFilter) return false;
      if (assigneeFilter !== ALL && t.assigneeName !== assigneeFilter) return false;
      if (q) {
        const hay = `${t.key} ${t.summary} ${t.client || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, search, statusFilter, typeFilter, assigneeFilter, openOnly]);

  function clearFilters() {
    setSearch("");
    setStatusFilter(ALL);
    setTypeFilter(ALL);
    setAssigneeFilter(ALL);
    setOpenOnly(false);
  }

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
              onClick={() => setView("list")}
              className={`btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
                view === "list" ? "bg-primary text-white" : "text-muted hover:text-ink"
              }`}
            >
              <List size={13} /> List
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

      {view === "board" && <KanbanBoard tasks={tasks} rules={rules} />}

      {view === "list" && (
        <Card>
          <div className="flex flex-wrap items-center gap-2.5 mb-5">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                placeholder="Search task, summary, client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-line rounded-pill pl-9 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-line rounded-pill pl-3.5 pr-8 py-2 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition cursor-pointer"
            >
              <option value={ALL}>All statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-line rounded-pill pl-3.5 pr-8 py-2 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition cursor-pointer"
            >
              <option value={ALL}>All content types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="border border-line rounded-pill pl-3.5 pr-8 py-2 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition cursor-pointer"
            >
              <option value={ALL}>All assignees</option>
              {assigneeOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-muted bg-paper border border-line rounded-pill px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="accent-primary"
              />
              Open only
            </label>
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="btn-press flex items-center gap-1.5 text-sm text-muted hover:text-tag-pink-text px-2 py-2 transition-colors"
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>

          <p className="text-sm text-muted mb-3">
            {listRows.length} of {tasks.length} tasks
          </p>

          <TaskTable tasks={listRows} rules={rules} identityColumn="both" />
        </Card>
      )}

      {view === "chart" && (
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
