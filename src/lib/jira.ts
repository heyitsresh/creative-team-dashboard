import type { NormalizedTask, StatusCategory } from "@/types";

const SITE = process.env.JIRA_SITE || "ave7.atlassian.net";
const CLIENT_FIELD = process.env.JIRA_CLIENT_FIELD || "customfield_10866";
const PROJECT_KEYS = (process.env.JIRA_PROJECT_KEYS || "CREATE")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function authHeader() {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!email || !token) {
    throw new Error("Missing JIRA_EMAIL or JIRA_API_TOKEN env vars");
  }
  return "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
}

const FIELDS = [
  "summary",
  "status",
  "issuetype",
  "assignee",
  "project",
  "labels",
  "priority",
  "created",
  "updated",
  "duedate",
  CLIENT_FIELD,
];

interface JiraApiIssue {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: { key: string };
    };
    issuetype: { name: string };
    assignee: {
      displayName: string;
      emailAddress?: string;
      avatarUrls?: Record<string, string>;
    } | null;
    project: { key: string };
    labels: string[];
    priority: { name: string } | null;
    created: string;
    updated: string;
    duedate: string | null;
    [key: string]: unknown;
  };
}

function mapStatusCategory(key: string): StatusCategory {
  if (key === "done") return "done";
  if (key === "indeterminate") return "indeterminate";
  return "new";
}

function hoursBetween(a: string, b: string) {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 36e5);
}

function normalize(issue: JiraApiIssue): NormalizedTask {
  const f = issue.fields;
  const now = new Date().toISOString();
  const clientField = f[CLIENT_FIELD] as { value?: string } | string | null | undefined;
  const client =
    typeof clientField === "string" ? clientField : clientField?.value ?? null;

  return {
    key: issue.key,
    projectKey: f.project.key,
    summary: f.summary,
    status: f.status.name,
    statusCategory: mapStatusCategory(f.status.statusCategory.key),
    issueType: f.issuetype.name,
    assigneeName: f.assignee?.displayName ?? null,
    assigneeEmail: f.assignee?.emailAddress ?? null,
    assigneeAvatarUrl:
      f.assignee?.avatarUrls?.["48x48"] || f.assignee?.avatarUrls?.["32x32"] || null,
    client,
    labels: f.labels || [],
    contentType: f.labels?.[0] || "Uncategorized",
    priority: f.priority?.name ?? null,
    created: f.created,
    updated: f.updated,
    dueDate: f.duedate ?? null,
    webUrl: `https://${SITE}/browse/${issue.key}`,
    hoursInQueue: hoursBetween(f.created, now),
    hoursSinceUpdate: hoursBetween(f.updated, now),
  };
}

/**
 * Fetches every issue across JIRA_PROJECT_KEYS via Jira Cloud's enhanced
 * search endpoint (GET /rest/api/3/search/jql), the same auth pattern used by
 * the Pendleton dashboard (Basic auth, JIRA_EMAIL + JIRA_API_TOKEN). Paginates
 * via nextPageToken until exhausted.
 */
export async function fetchAllTasks(): Promise<NormalizedTask[]> {
  const jql = `project in (${PROJECT_KEYS.map((k) => `"${k}"`).join(", ")}) ORDER BY updated DESC`;

  const tasks: NormalizedTask[] = [];
  let nextPageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      jql,
      fields: FIELDS.join(","),
      maxResults: "100",
    });
    if (nextPageToken) params.set("nextPageToken", nextPageToken);

    const res = await fetch(`https://${SITE}/rest/api/3/search/jql?${params.toString()}`, {
      headers: {
        Authorization: authHeader(),
        Accept: "application/json",
      },
      // Jira data changes often enough that we don't want a stale Next.js
      // fetch cache; API routes control caching at a higher level instead.
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Jira search failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as {
      issues: JiraApiIssue[];
      nextPageToken?: string;
    };

    tasks.push(...data.issues.map(normalize));
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return tasks;
}

export { PROJECT_KEYS };
