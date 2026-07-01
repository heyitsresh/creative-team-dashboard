import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { PageHeader, TabButton } from "@/components/ui/PageHeader";
import { useTeamData, useSlaRules } from "@/lib/useTasks";
import { useAutosave } from "@/lib/useAutosave";
import type { Team, TeamMember, SlaRule } from "@/types";

type Tab = "team" | "sla";

export default function Settings() {
  const [tab, setTab] = useState<Tab>("team");

  return (
    <DashboardLayout>
      <PageHeader
        title="Settings"
        description="Build the org chart and SLA budgets here — every field autosaves, no redeploy needed. This is the one place team roster and SLA hours live; the Team and Queue vs SLA views read straight from it."
        tabs={
          <>
            <TabButton active={tab === "team"} onClick={() => setTab("team")}>
              Team Setup
            </TabButton>
            <TabButton active={tab === "sla"} onClick={() => setTab("sla")}>
              SLA Setup
            </TabButton>
          </>
        }
      />

      {tab === "team" ? <TeamSetup /> : <SlaSetup />}
    </DashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Team Setup — add teams, add members to a team, wire each member to their
// Jira account email so open-task stats can join automatically.
// ---------------------------------------------------------------------------
function TeamSetup() {
  const { teams, members, refresh } = useTeamData();
  const { save: saveTeam, state: teamState } = useAutosave<Partial<Team>>("/api/team", {});
  const { save: saveMember } = useAutosave<Partial<TeamMember> & { type: string }>(
    "/api/team",
    {}
  );

  async function addTeam() {
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "team",
        payload: { name: "New team", sort_order: teams.length },
      }),
    });
    if (res.ok) refresh();
  }

  async function addMember(teamId: string) {
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "member",
        payload: {
          team_id: teamId,
          name: "New member",
          role: "",
          jira_email: "",
          weekly_capacity_hours: 40,
          sort_order: members.filter((m: TeamMember) => m.team_id === teamId).length,
        },
      }),
    });
    if (res.ok) refresh();
  }

  async function remove(type: "team" | "member", id: string) {
    await fetch("/api/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    refresh();
  }

  return (
    <div className="flex flex-col gap-5 stagger">
      {teams.map((team: Team) => (
        <Card key={team.id}>
          <div className="flex items-center justify-between mb-4 gap-3">
            <input
              defaultValue={team.name}
              onChange={(e) =>
                saveTeam({ id: team.id, name: e.target.value, sort_order: team.sort_order })
              }
              className="font-semibold text-lg bg-transparent outline-none border-b border-transparent focus:border-primary/40 flex-1 transition-colors"
            />
            <button
              onClick={() => remove("team", team.id)}
              className="text-xs text-muted hover:text-tag-pink-text transition-colors"
            >
              Remove team
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {members
              .filter((m: TeamMember) => m.team_id === team.id)
              .map((m: TeamMember) => (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_1fr_1.2fr_100px_auto] gap-2 items-center text-sm"
                >
                  <input
                    defaultValue={m.name}
                    placeholder="Name"
                    onChange={(e) =>
                      saveMember({ type: "member", id: m.id, name: e.target.value })
                    }
                    className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                  />
                  <input
                    defaultValue={m.role ?? ""}
                    placeholder="Role"
                    onChange={(e) =>
                      saveMember({ type: "member", id: m.id, role: e.target.value })
                    }
                    className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                  />
                  <input
                    defaultValue={m.jira_email ?? ""}
                    placeholder="Jira account email"
                    onChange={(e) =>
                      saveMember({ type: "member", id: m.id, jira_email: e.target.value })
                    }
                    className={`border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition ${
                      m.jira_email ? "border-line" : "border-tag-yellow-text/40"
                    }`}
                  />
                  <input
                    type="number"
                    defaultValue={m.weekly_capacity_hours}
                    placeholder="Hrs/wk"
                    onChange={(e) =>
                      saveMember({
                        type: "member",
                        id: m.id,
                        weekly_capacity_hours: Number(e.target.value),
                      })
                    }
                    className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                  />
                  <button
                    onClick={() => remove("member", m.id)}
                    className="text-xs text-muted hover:text-tag-pink-text justify-self-end transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>

          <button
            onClick={() => addMember(team.id)}
            className="btn-press mt-3 text-sm text-primary font-medium"
          >
            + Add team member
          </button>
        </Card>
      ))}

      <button
        onClick={addTeam}
        className="btn-press self-start px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        + Add team
      </button>

      <span className="text-xs text-muted">
        {teamState === "saving" && "Saving…"}
        {teamState === "saved" && "Saved"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLA Setup — two hour figures per Jira label (content type), sourced from
// the standardized time-logging sheet: standard_hours is real labor effort
// (drives the workload/capacity view), hours_budget is calendar-time
// turnaround before something's flagged overdue (drives Alerts/Queue).
// ---------------------------------------------------------------------------
function SlaSetup() {
  const { rules, refresh } = useSlaRules();
  const { save, state } = useAutosave<Partial<SlaRule>>("/api/sla", {});

  async function addRule() {
    const res = await fetch("/api/sla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: `New label ${rules.length + 1}`,
        standard_hours: 2,
        hours_budget: 24,
      }),
    });
    if (res.ok) refresh();
  }

  async function remove(id: string) {
    await fetch("/api/sla", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    refresh();
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Hours per content type</h2>
          <p className="text-xs text-muted mt-1">
            Standard hours = real labor effort (workload view). Turnaround SLA
            = calendar hours before flagged overdue (Alerts/Queue views).
          </p>
        </div>
        <span className="text-xs text-muted shrink-0">
          {state === "saving" && "Saving…"}
          {state === "saved" && "Saved"}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_1fr_110px_110px_auto] gap-2 label-caps px-1">
          <span>Jira label</span>
          <span>Display name</span>
          <span>Standard hrs</span>
          <span>Turnaround SLA</span>
          <span />
        </div>
        {rules.map((r: SlaRule) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_1fr_110px_110px_auto] gap-2 items-center text-sm"
          >
            <input
              defaultValue={r.label}
              onChange={(e) => save({ id: r.id, label: e.target.value })}
              className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
            />
            <input
              defaultValue={r.display_name ?? ""}
              onChange={(e) => save({ id: r.id, label: r.label, display_name: e.target.value })}
              className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
            />
            <input
              type="number"
              step="0.25"
              defaultValue={r.standard_hours}
              onChange={(e) =>
                save({ id: r.id, label: r.label, standard_hours: Number(e.target.value) })
              }
              className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
            />
            <input
              type="number"
              defaultValue={r.hours_budget}
              onChange={(e) =>
                save({ id: r.id, label: r.label, hours_budget: Number(e.target.value) })
              }
              className="border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
            />
            <button
              onClick={() => remove(r.id)}
              className="text-xs text-muted hover:text-tag-pink-text justify-self-end transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button onClick={addRule} className="btn-press mt-4 text-sm text-primary font-medium">
        + Add content type
      </button>
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
