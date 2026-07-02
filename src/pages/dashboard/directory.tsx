import { useMemo, useState } from "react";
import { Search, Globe, Trash2, Pencil, Check } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { useClients, useTeamData, useTasks } from "@/lib/useTasks";
import { useAutosave } from "@/lib/useAutosave";
import { isOpen } from "@/lib/metrics";
import type { Client, Team } from "@/types";

const PRIORITY_TONE: Record<string, string> = {
  HIGH: "bg-tag-pink-bg text-tag-pink-text",
  MED: "bg-tag-yellow-bg text-tag-yellow-text",
  LOW: "bg-line text-ink/70",
};

// Controlled vocabulary going forward — the sheet this was seeded from had
// free text ("HIGH PRIORITY", "HIGH", "Med Priority", …), which made the
// data inconsistent and impossible to filter/tag cleanly. New edits always
// write one of these four canonical values; legacy free-text values still
// display fine (priorityTone() below fuzzy-matches on substring), they just
// get normalized the moment someone re-saves that field via the dropdown.
const PRIORITY_OPTIONS = ["High priority", "Medium priority", "Low priority", "Maintenance"];

function priorityTone(priority: string | null) {
  const p = (priority ?? "").toUpperCase();
  if (p.includes("HIGH")) return PRIORITY_TONE.HIGH;
  if (p.includes("MED")) return PRIORITY_TONE.MED;
  if (p.includes("LOW") || p.includes("MAINTENANCE")) return PRIORITY_TONE.LOW;
  return "bg-line text-ink/70";
}

function canonicalPriority(priority: string | null) {
  const p = (priority ?? "").toUpperCase();
  if (p.includes("HIGH")) return "High priority";
  if (p.includes("MED")) return "Medium priority";
  if (p.includes("MAINTENANCE")) return "Maintenance";
  if (p.includes("LOW")) return "Low priority";
  return "";
}

// Best-effort open-task count: the sheet's brand names ("Pendleton") don't
// exactly match Jira's client field format ("Pendleton: AMZ"), so this is a
// loose contains-match on normalized strings — approximate, not exact.
function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function BrandDirectory() {
  const { clients, isLoading: clientsLoading, refresh } = useClients();
  const { teams, isLoading: teamsLoading } = useTeamData();
  const { tasks } = useTasks();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const { save, state } = useAutosave<Partial<Client> & { id: string }>("/api/clients", {});

  const openCountByClientName = useMemo(() => {
    const open = tasks.filter(isOpen);
    const map = new Map<string, number>();
    for (const c of clients) {
      const needle = normalize(c.name);
      if (!needle) continue;
      let count = 0;
      for (const t of open) {
        if (!t.client) continue;
        const hay = normalize(t.client);
        if (hay.includes(needle) || needle.includes(hay)) count++;
      }
      map.set(c.id, count);
    }
    return map;
  }, [clients, tasks]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (teamFilter !== "all" && c.team_id !== teamFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [clients, teamFilter, search]);

  async function addClient() {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New brand",
        team_id: teams[0]?.id ?? null,
        sort_order: clients.length,
      }),
    });
    if (res.ok) refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this brand from the directory?")) return;
    await fetch("/api/clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    refresh();
  }

  if (clientsLoading || teamsLoading) {
    return (
      <DashboardLayout>
        <LoadingState />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Brand Directory"
        description="Every brand from the Brand Directory sheet — logos included. Team assignment, priority notes, category, and website all autosave here; no redeploy needed."
        actions={
          <span className="text-xs text-muted">
            {state === "saving" && "Saving…"}
            {state === "saved" && "Saved"}
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands…"
            className="w-full border border-line rounded-pill pl-9 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
          />
        </div>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="border border-line rounded-pill pl-4 pr-9 py-2 text-sm bg-white font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition cursor-pointer"
        >
          <option value="all">All teams</option>
          {teams.map((t: Team) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted ml-auto">
          {filtered.length} of {clients.length} brands
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
        {filtered.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            teams={teams}
            openCount={openCountByClientName.get(c.id) ?? 0}
            onSave={(patch) => save({ id: c.id, ...patch })}
            onRemove={() => remove(c.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-sm text-muted py-16">
          No brands match your filters.
        </div>
      )}

      <button
        onClick={addClient}
        className="btn-press mt-6 px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        + Add brand
      </button>
    </DashboardLayout>
  );
}

function ClientCard({
  client,
  teams,
  openCount,
  onSave,
  onRemove,
}: {
  client: Client;
  teams: Team[];
  openCount: number;
  onSave: (patch: Partial<Client>) => void;
  onRemove: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const teamName = teams.find((t) => t.id === client.team_id)?.name;
  const websiteHref = client.website ? client.website.trim().split(/\s+/)[0] : null;

  const logo =
    client.logo_path && !imgFailed ? (
      <img
        src={client.logo_path}
        alt={client.name}
        onError={() => setImgFailed(true)}
        className="h-12 w-12 rounded-lg object-contain bg-white border border-line shrink-0 p-1"
      />
    ) : (
      <div className="h-12 w-12 rounded-lg bg-primary-light flex items-center justify-center text-primary font-semibold text-sm shrink-0">
        {client.name.slice(0, 2).toUpperCase()}
      </div>
    );

  if (!editing) {
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          {logo}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{client.name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`pill text-[10px] ${priorityTone(client.priority)}`}>
                {client.priority || "No priority"}
              </span>
              {teamName && <span className="text-[11px] text-muted">{teamName}</span>}
              <span className="text-[11px] text-muted">{openCount} open</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-muted hover:text-primary transition-colors"
              title="Edit brand"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onRemove}
              className="text-muted hover:text-tag-pink-text transition-colors"
              title="Remove brand"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {(client.category || websiteHref || client.priority_note) && (
          <div className="text-xs text-ink/70 flex flex-col gap-1.5">
            {client.category && <p>{client.category}</p>}
            {websiteHref && (
              <a
                href={websiteHref}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 w-fit"
              >
                <Globe size={11} /> {websiteHref.replace(/^https?:\/\//, "")}
              </a>
            )}
            {client.priority_note && (
              <p className="text-muted line-clamp-2">{client.priority_note}</p>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 ring-2 ring-primary/20">
      <div className="flex items-start gap-3">
        {logo}
        <div className="flex-1 min-w-0">
          <input
            defaultValue={client.name}
            onChange={(e) => onSave({ name: e.target.value })}
            className="font-semibold text-sm bg-transparent outline-none border-b border-transparent focus:border-primary/40 w-full transition-colors"
          />
          <span className="text-[11px] text-muted">{openCount} open</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(false)}
            className="text-primary hover:text-primary-dark transition-colors"
            title="Done editing"
          >
            <Check size={16} />
          </button>
          <button
            onClick={onRemove}
            className="text-muted hover:text-tag-pink-text transition-colors"
            title="Remove brand"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <select
          defaultValue={client.team_id ?? ""}
          onChange={(e) => onSave({ team_id: e.target.value || null })}
          className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
        >
          <option value="">No team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          defaultValue={canonicalPriority(client.priority)}
          onChange={(e) => onSave({ priority: e.target.value || null })}
          className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
        >
          <option value="">No priority</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          defaultValue={client.category ?? ""}
          placeholder="Category"
          onChange={(e) => onSave({ category: e.target.value })}
          className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition col-span-2"
        />
        <div className="flex items-center gap-1 border border-line rounded-lg px-2 py-1.5 bg-white col-span-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition">
          <Globe size={12} className="text-muted shrink-0" />
          <input
            defaultValue={client.website ?? ""}
            placeholder="Website"
            onChange={(e) => onSave({ website: e.target.value })}
            className="flex-1 min-w-0 outline-none bg-transparent"
          />
        </div>
        <textarea
          defaultValue={client.priority_note ?? ""}
          placeholder="Notes / market context…"
          onChange={(e) => onSave({ priority_note: e.target.value })}
          rows={2}
          className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition col-span-2 resize-none"
        />
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
