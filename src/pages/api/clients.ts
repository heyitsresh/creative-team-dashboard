import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET  -> { clients }
// POST -> payload (upsert; autosave from the Brand Directory page)
// DELETE -> { id }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = supabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await admin.from("clients").select("*").order("sort_order");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ clients: data });
  }

  if (req.method === "POST") {
    const payload = req.body || {};
    const { data, error } = await admin.from("clients").upsert(payload).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    const { error } = await admin.from("clients").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
