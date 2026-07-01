import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { useRequireUser } from "@/lib/useUser";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const user = useRequireUser();
  const router = useRouter();

  if (user === undefined) {
    return <div className="min-h-screen bg-sidebar" />;
  }

  return (
    <div className="min-h-screen bg-paper flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar user={user} />
        <main className="flex-1 px-6 py-8 max-w-[1400px] w-full mx-auto">
          <div key={router.pathname} className="animate-fade-slide-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
