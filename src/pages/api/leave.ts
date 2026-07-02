import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET  -> { requests }
// POST -> payload (upsert; submitting/editing a leave request)
// DELETE -> { id }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = supabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await admin
      .from("leave_requests")
      .select("*")
      .order("start_date");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ requests: data });
  }

  if (req.method === "POST") {
    const payload = req.body || {};
    const { data, error } = await admin
      .from("leave_requests")
      .upsert(payload)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    const { error } = await admin.from("leave_requests").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
