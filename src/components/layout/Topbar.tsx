import { useState } from "react";
import { useRouter } from "next/router";
import { Search, Bell, ChevronDown, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/useUser";
import { useTasks, useSlaRules } from "@/lib/useTasks";
import { isOpen, isBreached } from "@/lib/metrics";
import { Avatar } from "@/components/ui/Avatar";

export function Topbar({ user }: { user: User | null | undefined }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { tasks } = useTasks();
  const { rules } = useSlaRules();

  const breaches = tasks.filter((t) => isOpen(t) && isBreached(t, rules)).length;

  return (
    <div className="h-16 shrink-0 flex items-center gap-4 px-6 border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-10">
      <div className="relative flex-1 max-w-sm">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          placeholder="Search anything you want…"
          className="w-full bg-white border border-line rounded-pill pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
          onKeyDown={(e) => {
            if (e.key === "Enter") router.push("/dashboard/clients");
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/alerts")}
          className="btn-press relative h-10 w-10 rounded-full bg-white border border-line flex items-center justify-center hover:bg-primary-light transition"
        >
          <Bell size={16} className="text-ink/70" />
          {breaches > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-tag-pink-text text-white text-[10px] font-bold flex items-center justify-center">
              {breaches}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="btn-press flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-white border border-line hover:bg-primary-light transition"
          >
            <Avatar name={user?.email?.split("@")[0].replace(/[._]/g, " ") || "?"} size={30} />
            <ChevronDown size={14} className="text-muted" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-line rounded-xl shadow-cardHover p-2 animate-pop-in z-20">
              <p className="px-3 py-2 text-xs text-muted truncate">{user?.email}</p>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-primary-light text-ink/80 transition"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
