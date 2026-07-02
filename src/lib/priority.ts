import type { Client } from "@/types";

export const PRIORITY_BUCKETS = ["High", "Medium", "Low"] as const;
export type PriorityBucket = (typeof PRIORITY_BUCKETS)[number];

export function priorityBucket(priority: string | null): PriorityBucket | null {
  const p = (priority ?? "").toUpperCase();
  if (p.includes("HIGH")) return "High";
  if (p.includes("MED")) return "Medium";
  if (p.includes("LOW") || p.includes("MAINTENANCE")) return "Low";
  return null;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Best-effort match from a live Jira client string (e.g. "Pendleton: AMZ")
 * to its Brand Directory row (e.g. "Pendleton") — the sheet's brand names
 * don't exactly match Jira's client field format, so this is a loose
 * contains-match on normalized strings, same approach used on the Brand
 * Directory page's open-task counts. Not exact, but good enough to bucket
 * clients by priority for a "quick scan" grouped view.
 */
export function matchClientRecord(jiraClientName: string, brandClients: Client[]): Client | null {
  const needle = normalize(jiraClientName);
  if (!needle) return null;
  let best: Client | null = null;
  for (const c of brandClients) {
    const hay = normalize(c.name);
    if (!hay) continue;
    if (hay === needle) return c; // exact normalized match wins immediately
    if (!best && (hay.includes(needle) || needle.includes(hay))) best = c;
  }
  return best;
}
