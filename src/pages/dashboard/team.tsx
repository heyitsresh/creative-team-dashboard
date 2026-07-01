import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OrgChart } from "@/components/orgchart/OrgChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { useTasks, useTeamData, useSlaRules } from "@/lib/useTasks";
import { LoadingState } from "@/components/ui/LoadingState";

export default function TeamPage() {
  const { tasks, isLoading: tasksLoading } = useTasks();
  const { teams, members, isLoading: teamLoading } = useTeamData();
  const { rules } = useSlaRules();

  if (tasksLoading || teamLoading) {
    return (
      <DashboardLayout>
        <LoadingState />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Team"
        description="Drill into each team to see open-task load per person."
        actions={
          <a
            href="/dashboard/settings"
            className="btn-press text-sm bg-white border border-line rounded-pill px-4 py-2 font-medium text-ink hover:bg-primary-light transition"
          >
            Edit org chart
          </a>
        }
      />

      <OrgChart teams={teams} members={members} tasks={tasks} rules={rules} />
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
