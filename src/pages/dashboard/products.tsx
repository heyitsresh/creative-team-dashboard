import { useEffect, useMemo, useState } from "react";
import { Search, Tag, Pencil, Check, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Pill } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingState } from "@/components/ui/LoadingState";
import { useTasks, useAsinOverrides } from "@/lib/useTasks";
import { isOpen, groupCount } from "@/lib/metrics";
import { statusDotColor } from "@/lib/taskDisplay";
import { extractAsin } from "@/lib/asin";
import { useAutosave } from "@/lib/useAutosave";
import type { NormalizedTask } from "@/types";

const NO_ASIN = "No ASIN Detected";

export default function ByProductPage() {
  const { tasks, isLoading } = useTasks();
  const { overrides, refresh: refreshOverrides } = useAsinOverrides();
  const [search, setSearch] = useState("");
  const [asinSearch, setAsinSearch] = useState("");
  const [selectedAsin, setSelectedAsin] = useState<string | null>(null);
  const [clientFilters, setClientFilters] = useState<string[]>([]);
  const { save: saveOverride } = useAutosave<{ issue_key: string; asin: string }>(
    "/api/asin-overrides",
    { delayMs: 500 }
  );

  const overrideMap = useMemo(
    () => new Map(overrides.map((o) => [o.issue_key, o.asin])),
    [overrides]
  );

  function taskAsin(t: NormalizedTask): string {
    return overrideMap.get(t.key) || extractAsin(t.summary) || NO_ASIN;
  }

  const open = useMemo(() => tasks.filter(isOpen), [tasks]);

  const clientOptions = useMemo(() => {
    const counts = groupCount(open, (t) => t.client || "No client");
    return counts.filter((c) => c.name !== "No client");
  }, [open]);

  const scoped = useMemo(() => {
    if (clientFilters.length === 0) return open;
    return open.filter((t) => clientFilters.includes(t.client || "No client"));
  }, [open, clientFilters]);

  function toggleClient(name: string) {
    setClientFilters((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  const byStatus = useMemo(() => groupCount(scoped, (t) => t.status), [scoped]);
  const byAssignee = useMemo(
    () => groupCount(scoped, (t) => t.assigneeName || "Unassigned").slice(0, 6),
    [scoped]
  );

  const asinGroups = useMemo(() => {
    const map = new Map<string, NormalizedTask[]>();
    for (const t of scoped) {
      const asin = taskAsin(t);
      if (!map.has(asin)) map.set(asin, []);
      map.get(asin)!.push(t);
    }
    const groups = Array.from(map.entries())
      .map(([asin, list]) => ({ asin, tasks: list }))
      .filter((g) => g.asin.toLowerCase().includes(asinSearch.toLowerCase()))
      .sort((a, b) => b.tasks.length - a.tasks.length);
    // "No ASIN Detected" always pinned first regardless of count, matching
    // the reference layout — it's the bucket that needs attention.
    groups.sort((a, b) => (a.asin === NO_ASIN ? -1 : b.asin === NO_ASIN ? 1 : 0));
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, overrideMap, asinSearch]);

  const selected = asinGroups.find((g) => g.asin === (selectedAsin ?? asinGroups[0]?.asin));
  const selectedRows = useMemo(() => {
    if (!selected) return [];
    if (!search.trim()) return selected.tasks;
    const q = search.trim().toLowerCase();
    return selected.tasks.filter(
      (t) => t.key.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q)
    );
  }, [selected, search]);

  // Renaming the whole group (from the header) re-tags every task currently
  // in it at once — e.g. clear out "No ASIN Detected" in bulk by assigning
  // the real ASIN to all of them in one go, instead of tagging one task at
  // a time.
  const [renamingGroup, setRenamingGroup] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    setRenamingGroup(false);
  }, [selectedAsin]);

  function startGroupRename() {
    setRenameValue(selected?.asin === NO_ASIN ? "" : selected?.asin ?? "");
    setRenamingGroup(true);
  }

  async function saveGroupRename() {
    const newAsin = renameValue.trim().toUpperCase();
    if (!selected || !newAsin || newAsin === selected.asin) {
      setRenamingGroup(false);
      return;
    }
    setRenaming(true);
    try {
      await fetch("/api/asin-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.tasks.map((t) => ({ issue_key: t.key, asin: newAsin })),
        }),
      });
      await refreshOverrides();
      setSelectedAsin(newAsin);
      setRenamingGroup(false);
    } finally {
      setRenaming(false);
    }
  }

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
        title="By Product"
        description="Open tasks grouped by ASIN, parsed from each task's title."
        actions={
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search task…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-line rounded-pill pl-9 pr-4 py-2 text-sm bg-white w-56 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
            />
          </div>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-2xl font-bold">{scoped.length}</p>
            <p className="label-caps">Open tasks{clientFilters.length > 0 ? " (filtered)" : " across all brands"}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {byStatus.map((s) => (
              <span key={s.name} className="pill bg-paper text-ink/70 flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: statusDotColor(s.name) }}
                />
                {s.name} {s.value}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {byAssignee.map((a) => (
              <div key={a.name} className="flex items-center gap-1.5" title={a.name}>
                <Avatar name={a.name} size={26} />
                <span className="text-xs text-muted whitespace-nowrap">{a.value} open</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <p className="text-xs text-muted mb-2">
        Grouped by ASIN pulled from each task's title — tasks whose title doesn't contain a
        recognizable ASIN land under "{NO_ASIN}". Edit{" "}
        <code className="bg-paper px-1 py-0.5 rounded">src/lib/asin.ts</code> if your titles use a
        different pattern.
      </p>

      {clientOptions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-muted mb-2">Filter by brand (select as many as you need)</p>
          <div className="flex flex-wrap gap-1.5">
            {clientOptions.map((c) => {
              const active = clientFilters.includes(c.name);
              return (
                <button
                  key={c.name}
                  onClick={() => toggleClient(c.name)}
                  className={`rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
                    active ? "bg-primary text-white" : "bg-white border border-line text-ink/70 hover:bg-primary-light"
                  }`}
                >
                  {c.name} ({c.value})
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card className="p-0 overflow-hidden flex flex-col max-h-[640px]">
          <div className="p-3 border-b border-line">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                placeholder="Search ASIN…"
                value={asinSearch}
                onChange={(e) => setAsinSearch(e.target.value)}
                className="w-full border border-line rounded-pill pl-8 pr-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {asinGroups.map((g) => {
              const isSelected = g.asin === (selectedAsin ?? asinGroups[0]?.asin);
              return (
                <button
                  key={g.asin}
                  onClick={() => setSelectedAsin(g.asin)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm border-b border-line/60 transition-colors ${
                    isSelected ? "bg-primary-light text-primary-dark font-medium" : "hover:bg-paper/70"
                  }`}
                >
                  <span className={`truncate ${g.asin === NO_ASIN ? "italic text-muted" : "font-mono text-xs"}`}>
                    {g.asin}
                  </span>
                  <span className="shrink-0 text-xs rounded-full bg-tag-pink-bg text-tag-pink-text font-semibold px-1.5 py-0.5">
                    {g.tasks.length}
                  </span>
                </button>
              );
            })}
            {asinGroups.length === 0 && (
              <p className="text-xs text-muted p-3">No products match.</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            {renamingGroup ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveGroupRename();
                    if (e.key === "Escape") setRenamingGroup(false);
                  }}
                  placeholder="Real ASIN…"
                  className="border border-line rounded-lg px-2 py-1 text-sm font-mono bg-white w-40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                />
                <button
                  onClick={saveGroupRename}
                  disabled={renaming}
                  title="Save — retags every task in this group"
                  className="btn-press h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-50"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => setRenamingGroup(false)}
                  title="Cancel"
                  className="btn-press h-7 w-7 rounded-lg border border-line flex items-center justify-center hover:bg-paper transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={startGroupRename}
                disabled={!selected}
                className="group flex items-center gap-2 disabled:cursor-not-allowed"
                title="Rename this group — retags every task in it at once"
              >
                <h2 className="font-semibold font-mono">{selected?.asin ?? "—"}</h2>
                {selected && (
                  <Pencil
                    size={13}
                    className="text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </button>
            )}
            <span className="text-xs text-muted">{selectedRows.length} open tasks</span>
          </div>
          {renamingGroup && (
            <p className="text-xs text-muted -mt-2 mb-4">
              Saving retags all {selected?.tasks.length ?? 0} task
              {selected?.tasks.length === 1 ? "" : "s"} currently in this group to the new ASIN.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line label-caps font-normal">
                  <th className="py-2 pr-3">Task</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Assignee</th>
                  <th className="py-2 px-3">Client</th>
                  <th className="py-2 px-3 text-right">Days</th>
                  <th className="py-2 pl-3">Tag as product</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((t) => (
                  <ProductRow key={t.key} task={t} onSaved={refreshOverrides} save={saveOverride} />
                ))}
                {selectedRows.length === 0 && (
                  <tr>
                    <td className="py-6 text-muted" colSpan={6}>
                      No tasks to show.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function ProductRow({
  task,
  save,
  onSaved,
}: {
  task: NormalizedTask;
  save: (payload: { issue_key: string; asin: string }) => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(extractAsin(task.summary) ?? "");

  return (
    <tr className="border-b border-line/60 hover:bg-paper/60 transition-colors">
      <td className="py-2.5 pr-3">
        <a href={task.webUrl} target="_blank" rel="noreferrer" className="text-primary font-medium">
          {task.key}
        </a>
        <p className="text-xs text-muted truncate max-w-xs">{task.summary}</p>
      </td>
      <td className="py-2.5 px-3">
        <span className="inline-flex items-center gap-1.5 text-ink/80 whitespace-nowrap">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: statusDotColor(task.status) }}
          />
          {task.status}
        </span>
      </td>
      <td className="py-2.5 px-3 text-ink/70 whitespace-nowrap">
        {task.assigneeName || "Unassigned"}
      </td>
      <td className="py-2.5 px-3 text-ink/70 whitespace-nowrap">{task.client || "—"}</td>
      <td className="py-2.5 px-3 text-right text-ink/70 whitespace-nowrap">
        {Math.floor(task.hoursInQueue / 24)}d
      </td>
      <td className="py-2.5 pl-3">
        {editing ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            onBlur={() => {
              setEditing(false);
              if (value.trim()) {
                save({ issue_key: task.key, asin: value.trim() });
                setTimeout(onSaved, 700);
              }
            }}
            className="border border-line rounded-lg px-2 py-1 text-xs font-mono bg-white w-32 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="btn-press flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
          >
            <Tag size={11} />
            {value || "Tag…"}
          </button>
        )}
      </td>
    </tr>
  );
}

// Forces this page to render per-request instead of being statically
// prerendered at build time — it needs a live Supabase session, and static
// generation would try (and fail) to construct the Supabase client without
// a request context.
export async function getServerSideProps() {
  return { props: {} };
}
