export type StatusCategory = "new" | "indeterminate" | "done";

export interface NormalizedTask {
  key: string;
  projectKey: string;
  summary: string;
  status: string;
  statusCategory: StatusCategory;
  issueType: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
  assigneeAvatarUrl: string | null;
  client: string | null; // from JIRA_CLIENT_FIELD (customfield_10866)
  labels: string[];
  contentType: string; // first label, or "Uncategorized"
  priority: string | null;
  created: string;
  updated: string;
  dueDate: string | null;
  webUrl: string;
  // Hours since creation the task has been open (or, if done, hours it took)
  hoursInQueue: number;
  // Hours since it last changed status (proxy for "current" queue time if open)
  hoursSinceUpdate: number;
}

export interface TeamMember {
  id: string;
  team_id: string | null;
  name: string;
  role: string | null;
  jira_email: string | null;
  avatar_url: string | null;
  weekly_capacity_hours: number;
  sort_order: number;
}

export interface Team {
  id: string;
  name: string;
  sort_order: number;
}

export interface SlaRule {
  id: string;
  label: string;
  display_name: string | null;
  // Real labor-hours to complete this content type end-to-end (from the
  // standardized time-logging sheet). Drives per-person workload vs capacity.
  standard_hours: number;
  // Calendar-hour turnaround before an open task is flagged overdue.
  hours_budget: number;
  description: string | null;
}

export interface TaskNote {
  issue_key: string;
  note: string | null;
  sla_override_hours: number | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Client {
  id: string;
  team_id: string | null;
  name: string;
  priority: string | null;
  priority_note: string | null;
  category: string | null;
  website: string | null;
  logo_path: string | null;
  sort_order: number;
}
