import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET  -> { holidays }
// POST -> payload (upsert; for adding/correcting a holiday in-app)
// DELETE -> { id }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = supabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await admin.from("holidays").select("*").order("date");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ holidays: data });
  }

  if (req.method === "POST") {
    const payload = req.body || {};
    const { data, error } = await admin.from("holidays").upsert(payload).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    const { error } = await admin.from("holidays").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
