import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET  -> { overrides }  (issue_key -> asin map, source for the By Product page)
// POST -> { issue_key, asin } OR { items: [{ issue_key, asin }, ...] }
//         (upsert; single tag from a task row, or a bulk rename when an
//         entire ASIN group is renamed at once from the group header)
// DELETE -> { issue_key }  (clear a manual tag, fall back to auto-detected ASIN)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = supabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await admin.from("task_asin_overrides").select("*");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ overrides: data });
  }

  if (req.method === "POST") {
    const body = req.body || {};

    if (Array.isArray(body.items)) {
      const rows = body.items.filter((r: any) => r?.issue_key && r?.asin);
      if (rows.length === 0) {
        return res.status(400).json({ error: "items must contain issue_key and asin" });
      }
      const { data, error } = await admin.from("task_asin_overrides").upsert(rows).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    const { issue_key, asin } = body;
    if (!issue_key || !asin) {
      return res.status(400).json({ error: "issue_key and asin are required" });
    }
    const { data, error } = await admin
      .from("task_asin_overrides")
      .upsert({ issue_key, asin })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  if (req.method === "DELETE") {
    const { issue_key } = req.body || {};
    const { error } = await admin.from("task_asin_overrides").delete().eq("issue_key", issue_key);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
