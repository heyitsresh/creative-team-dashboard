import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AvatarStack } from "@/components/ui/Avatar";
import { LoadingState } from "@/components/ui/LoadingState";
import { useHolidays, useLeaveRequests, useTeamData } from "@/lib/useTasks";
import type { TeamMember } from "@/types";

const COUNTRY_LABEL: Record<string, string> = { US: "US", PH: "PH", PK: "Pakistan" };
const COUNTRY_DOT: Record<string, string> = {
  US: "bg-tag-blue-text",
  PH: "bg-tag-yellow-text",
  PK: "bg-tag-green-text",
};
const COUNTRY_BADGE: Record<string, string> = {
  US: "bg-tag-blue-bg text-tag-blue-text",
  PH: "bg-tag-yellow-bg text-tag-yellow-text",
  PK: "bg-tag-green-bg text-tag-green-text",
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function TeamCalendarPage() {
  const { holidays, isLoading: holidaysLoading, refresh: refreshHolidays } = useHolidays();
  const {
    requests,
    isLoading: leaveLoading,
    refresh: refreshLeave,
  } = useLeaveRequests();
  const { members, isLoading: teamLoading } = useTeamData();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [form, setForm] = useState({
    team_member_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, typeof holidays>();
    for (const h of holidays) {
      if (!map.has(h.date)) map.set(h.date, []);
      map.get(h.date)!.push(h);
    }
    return map;
  }, [holidays]);

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  function membersOnLeave(dateStr: string): TeamMember[] {
    const out: TeamMember[] = [];
    for (const r of requests) {
      if (dateStr >= r.start_date && dateStr <= r.end_date) {
        const m = r.team_member_id ? memberById.get(r.team_member_id) : null;
        if (m) out.push(m);
      }
    }
    return out;
  }

  const weeks = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDow = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [cursor]);

  const upcomingLeave = useMemo(() => {
    const todayStr = ymd(new Date());
    return [...requests]
      .filter((r) => r.end_date >= todayStr)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [requests]);

  async function submitLeave() {
    if (!form.team_member_id || !form.start_date || !form.end_date) return;
    setSubmitting(true);
    try {
      await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_member_id: form.team_member_id,
          start_date: form.start_date,
          end_date: form.end_date,
          reason: form.reason || null,
        }),
      });
      setForm({ team_member_id: "", start_date: "", end_date: "", reason: "" });
      refreshLeave();
    } finally {
      setSubmitting(false);
    }
  }

  async function removeLeave(id: string) {
    await fetch("/api/leave", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    refreshLeave();
  }

  if (holidaysLoading || leaveLoading || teamLoading) {
    return (
      <DashboardLayout>
        <LoadingState />
      </DashboardLayout>
    );
  }

  const todayStr = ymd(new Date());

  return (
    <DashboardLayout>
      <PageHeader
        title="Team Calendar"
        description="US, Philippines, and Pakistan public holidays, plus who's on leave and when."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                className="btn-press h-8 w-8 rounded-lg border border-line flex items-center justify-center hover:bg-paper transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={15} />
              </button>
              <h2 className="font-semibold w-40 text-center">{monthLabel(cursor)}</h2>
              <button
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="btn-press h-8 w-8 rounded-lg border border-line flex items-center justify-center hover:bg-paper transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              {Object.entries(COUNTRY_LABEL).map(([code, label]) => (
                <span key={code} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${COUNTRY_DOT[code]}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted mb-1 label-caps">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            {weeks.map((row, i) => (
              <div key={i} className="grid grid-cols-7 gap-1">
                {row.map((date, j) => {
                  if (!date) return <div key={j} className="min-h-[86px]" />;
                  const dateStr = ymd(date);
                  const dayHolidays = holidaysByDate.get(dateStr) ?? [];
                  const onLeave = membersOnLeave(dateStr);
                  const isToday = dateStr === todayStr;
                  return (
                    <div
                      key={j}
                      className={`min-h-[86px] rounded-lg border p-1.5 flex flex-col gap-1 ${
                        isToday ? "border-primary/50 bg-primary-light/40" : "border-line/60"
                      }`}
                    >
                      <span
                        className={`text-xs ${isToday ? "font-bold text-primary" : "text-ink/70"}`}
                      >
                        {date.getDate()}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {dayHolidays.slice(0, 2).map((h) => (
                          <span
                            key={h.id}
                            title={h.name}
                            className={`text-[9px] leading-tight rounded px-1 py-0.5 truncate ${COUNTRY_BADGE[h.country] || "bg-line text-ink/70"}`}
                          >
                            {h.name}
                          </span>
                        ))}
                        {dayHolidays.length > 2 && (
                          <span className="text-[9px] text-muted">+{dayHolidays.length - 2} more</span>
                        )}
                      </div>
                      {onLeave.length > 0 && (
                        <div className="mt-auto pt-0.5">
                          <AvatarStack names={onLeave.map((m) => m.name)} max={3} size={16} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="font-semibold mb-3">Request leave</h2>
            <div className="flex flex-col gap-2.5">
              <select
                value={form.team_member_id}
                onChange={(e) => setForm({ ...form, team_member_id: e.target.value })}
                className="border border-line rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
              >
                <option value="">Who's out?</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="border border-line rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                />
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="border border-line rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                />
              </div>
              <input
                placeholder="Reason (optional)"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="border border-line rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
              />
              <button
                onClick={submitLeave}
                disabled={submitting || !form.team_member_id || !form.start_date || !form.end_date}
                className="btn-press bg-primary text-white rounded-pill py-2 text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving…" : "Add to calendar"}
              </button>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold mb-3">Upcoming leave</h2>
            <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto">
              {upcomingLeave.map((r) => {
                const m = r.team_member_id ? memberById.get(r.team_member_id) : null;
                return (
                  <div key={r.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{m?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted">
                        {r.start_date === r.end_date
                          ? r.start_date
                          : `${r.start_date} → ${r.end_date}`}
                        {r.reason ? ` · ${r.reason}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => removeLeave(r.id)}
                      className="text-muted hover:text-tag-pink-text transition-colors shrink-0"
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
              {upcomingLeave.length === 0 && (
                <p className="text-xs text-muted">No upcoming leave on file.</p>
              )}
            </div>
          </Card>
        </div>
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
