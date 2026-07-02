import useSWR from "swr";
import type {
  NormalizedTask,
  Team,
  TeamMember,
  SlaRule,
  Client,
  Holiday,
  LeaveRequest,
  AsinOverride,
} from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR<{
    tasks: NormalizedTask[];
    fetchedAt: number;
  }>("/api/jira/tasks", fetcher, {
    refreshInterval: 120_000, // background refresh every 2 min
    revalidateOnFocus: true,
  });

  return {
    tasks: data?.tasks ?? [],
    fetchedAt: data?.fetchedAt,
    isLoading,
    error,
    refresh: () => mutate(),
  };
}

export function useTeamData() {
  const { data, error, isLoading, mutate } = useSWR<{
    teams: Team[];
    members: TeamMember[];
  }>("/api/team", fetcher);
  return {
    teams: data?.teams ?? [],
    members: data?.members ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
  };
}

export function useSlaRules() {
  const { data, error, isLoading, mutate } = useSWR<{ rules: SlaRule[] }>(
    "/api/sla",
    fetcher
  );
  return {
    rules: data?.rules ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
  };
}

export function useClients() {
  const { data, error, isLoading, mutate } = useSWR<{ clients: Client[] }>(
    "/api/clients",
    fetcher
  );
  return {
    clients: data?.clients ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
  };
}

export function useHolidays() {
  const { data, error, isLoading, mutate } = useSWR<{ holidays: Holiday[] }>(
    "/api/holidays",
    fetcher
  );
  return {
    holidays: data?.holidays ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
  };
}

export function useLeaveRequests() {
  const { data, error, isLoading, mutate } = useSWR<{ requests: LeaveRequest[] }>(
    "/api/leave",
    fetcher
  );
  return {
    requests: data?.requests ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
  };
}

export function useAsinOverrides() {
  const { data, error, isLoading, mutate } = useSWR<{ overrides: AsinOverride[] }>(
    "/api/asin-overrides",
    fetcher
  );
  return {
    overrides: data?.overrides ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
    // Merges rows into the local cache immediately (no waiting on a network
    // round trip) and then reconciles with the server in the background —
    // without this, a save can take a moment to show up anywhere that
    // reads this hook (e.g. the By Product sidebar list) because plain
    // revalidation isn't guaranteed to land before the next render.
    applyOverrides: (rows: AsinOverride[]) =>
      mutate(
        (current) => {
          const others = (current?.overrides ?? []).filter(
            (o) => !rows.some((r) => r.issue_key === o.issue_key)
          );
          return { overrides: [...others, ...rows] };
        },
        { revalidate: true }
      ),
  };
}
