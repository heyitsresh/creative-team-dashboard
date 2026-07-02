import Link from "next/link";
import { useRouter } from "next/router";
import {
  LayoutGrid,
  Users2,
  Network,
  KanbanSquare,
  Clock4,
  BellRing,
  TrendingUp,
  HeartPulse,
  Settings as SettingsIcon,
  RefreshCw,
} from "lucide-react";
import { useTeamData, useTasks } from "@/lib/useTasks";
import { AvatarStack } from "@/components/ui/Avatar";
import { isOpen } from "@/lib/metrics";
import type { Team, TeamMember } from "@/types";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/clients", label: "Clients & Content", icon: Users2 },
  { href: "/dashboard/team", label: "Team", icon: Network },
  { href: "/dashboard/status", label: "Status", icon: KanbanSquare },
  { href: "/dashboard/queue", label: "Queue vs SLA", icon: Clock4 },
  { href: "/dashboard/alerts", label: "Alerts", icon: BellRing },
  { href: "/dashboard/trends", label: "Trends", icon: TrendingUp },
  { href: "/dashboard/health", label: "Client Health", icon: HeartPulse },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const router = useRouter();
  const { teams, members } = useTeamData();
  const { fetchedAt, refresh, isLoading } = useTasks();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 h-screen sticky top-0 flex-col bg-sidebar text-white">
      <div className="flex items-center gap-3 px-6 py-5 shrink-0">
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
          A7
        </div>
        <div className="leading-tight min-w-0">
          <p className="font-semibold text-sm tracking-tight truncate">Avenue7Media</p>
          <p className="text-[11px] text-white/50 truncate">Creative Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? router.pathname === "/dashboard"
              : router.pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                active
                  ? "bg-white text-primary"
                  : "text-white/60 hover:bg-white hover:text-ink"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}

        {teams.length > 0 && (
          <div className="mt-6 px-3">
            <p className="label-caps text-white/35 mb-2">Teams</p>
            <div className="flex flex-col gap-2.5">
              {teams.slice(0, 5).map((team: Team) => {
                const teamMembers = members.filter(
                  (m: TeamMember) => m.team_id === team.id
                );
                return (
                  <Link
                    key={team.id}
                    href="/dashboard/team"
                    className="flex items-center justify-between text-white/70 hover:text-white transition-colors"
                  >
                    <span className="text-xs truncate">{team.name}</span>
                    <AvatarStack
                      names={teamMembers.map((m: TeamMember) => m.name)}
                      max={3}
                      size={20}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4">
        <SyncCard fetchedAt={fetchedAt} isLoading={isLoading} onRefresh={refresh} />
      </div>
    </aside>
  );
}

function SyncCard({
  fetchedAt,
  isLoading,
  onRefresh,
}: {
  fetchedAt?: number;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary to-[#4B3AC7] p-4 text-white">
      <p className="text-xs font-semibold mb-1">Synced with Jira</p>
      <p className="text-[11px] text-white/70 mb-3">
        {isLoading ? "Syncing…" : fetchedAt ? `Updated ${timeAgo(fetchedAt)}` : "—"}
      </p>
      <button
        onClick={onRefresh}
        className="btn-press w-full flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 transition rounded-full py-2 text-xs font-medium"
      >
        <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
        Refresh now
      </button>
    </div>
  );
}

function timeAgo(ts: number) {
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}
