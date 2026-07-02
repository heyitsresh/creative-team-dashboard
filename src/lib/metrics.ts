import type { NormalizedTask, SlaRule, TeamMember } from "@/types";

export function isOpen(t: NormalizedTask) {
  return t.statusCategory !== "done";
}

/**
 * Whether a Jira task belongs to a team member. Matches on email first
 * (the reliable case), but falls back to an exact display-name match when
 * either side is missing an email — Jira Cloud lets a user set their email
 * address visibility to private, which makes `emailAddress` come back null
 * on every issue they're assigned even though the account itself is fine
 * and the email you have on file in Settings is 100% correct. Without this
 * fallback, that person is invisible on Team/Queue/Alerts/Client Health
 * everywhere tasks are matched to people, even though their open tasks are
 * right there in Jira.
 */
export function taskMatchesMember(task: NormalizedTask, member: TeamMember): boolean {
  if (member.jira_email && task.assigneeEmail) {
    return member.jira_email.toLowerCase() === task.assigneeEmail.toLowerCase();
  }
  if (member.name && task.assigneeName) {
    return member.name.trim().toLowerCase() === task.assigneeName.trim().toLowerCase();
  }
  return false;
}

/** Calendar-hour turnaround budget before a task is considered overdue. */
export function slaHoursFor(t: NormalizedTask, rules: SlaRule[]): number {
  const rule = rules.find((r) => r.label === t.contentType);
  return rule?.hours_budget ?? 24;
}

/** Real labor-hours to complete this task's content type, for workload math. */
export function standardHoursFor(t: NormalizedTask, rules: SlaRule[]): number {
  const rule = rules.find((r) => r.label === t.contentType);
  return rule?.standard_hours ?? rule?.hours_budget ?? 2;
}

export function isBreached(t: NormalizedTask, rules: SlaRule[]): boolean {
  if (!isOpen(t)) return false;
  return t.hoursInQueue > slaHoursFor(t, rules);
}

export function groupCount<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || "Unassigned";
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Pastel/purple palette matching the app's tag colors, used for charts.
export const CHART_COLORS = [
  "#6C5CE7", // primary purple
  "#E0529C", // pink
  "#F5A623", // yellow/orange
  "#1FAA59", // green
  "#3D7BFD", // blue
  "#B983FF", // light violet
];
