import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET -> sla_rules[]
// POST -> upsert one rule (autosave), body = SlaRule fields (id optional)
// DELETE -> { id }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = supabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await admin.from("sla_rules").select("*").order("label");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rules: data });
  }

  if (req.method === "POST") {
    const { data, error } = await admin
      .from("sla_rules")
      .upsert(req.body, { onConflict: "label" })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    const { error } = await admin.from("sla_rules").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
