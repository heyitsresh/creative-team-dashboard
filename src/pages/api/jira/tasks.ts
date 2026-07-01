import type { NextApiRequest, NextApiResponse } from "next";
import { fetchAllTasks } from "@/lib/jira";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { NormalizedTask } from "@/types";

// Simple in-memory cache (per serverless instance) so every dashboard view
// switching tabs doesn't re-hit Jira. 60s is a reasonable freshness window
// for a queue-monitoring tool; drop to 0 if you want always-live data.
const CACHE_TTL_MS = 60_000;
let cache: { tasks: NormalizedTask[]; at: number } | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const force = req.query.refresh === "1";
    let tasks: NormalizedTask[];

    if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
      tasks = cache.tasks;
    } else {
      tasks = await fetchAllTasks();
      cache = { tasks, at: Date.now() };
    }

    // Merge in manual SLA overrides / notes stored in Supabase.
    const admin = supabaseAdmin();
    const { data: notes } = await admin
      .from("task_notes")
      .select("issue_key, note, sla_override_hours");

    const notesByKey = new Map((notes || []).map((n) => [n.issue_key, n]));
    const merged = tasks.map((t) => {
      const note = notesByKey.get(t.key);
      return note
        ? { ...t, note: note.note, slaOverrideHours: note.sla_override_hours }
        : t;
    });

    res.status(200).json({ tasks: merged, fetchedAt: cache?.at ?? Date.now() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
}
