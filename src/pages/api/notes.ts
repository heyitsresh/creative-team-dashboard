import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Autosaving per-issue notes / manual SLA overrides.
// POST body: { issue_key, note?, sla_override_hours?, updated_by? }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = supabaseAdmin();

  if (req.method === "POST") {
    const { issue_key, note, sla_override_hours, updated_by } = req.body || {};
    if (!issue_key) return res.status(400).json({ error: "issue_key is required" });

    const { data, error } = await admin
      .from("task_notes")
      .upsert({ issue_key, note, sla_override_hours, updated_by }, { onConflict: "issue_key" })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  res.setHeader("Allow", "POST");
  return res.status(405).json({ error: "Method not allowed" });
}
