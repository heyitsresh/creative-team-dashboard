import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET  -> { teams, members }
// POST -> { type: "team" | "member", payload }  (upsert; autosave from the UI)
// DELETE -> { type: "team" | "member", id }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = supabaseAdmin();

  if (req.method === "GET") {
    const [{ data: teams, error: teamsErr }, { data: members, error: membersErr }] =
      await Promise.all([
        admin.from("teams").select("*").order("sort_order"),
        admin.from("team_members").select("*").order("sort_order"),
      ]);
    if (teamsErr || membersErr) {
      return res.status(500).json({ error: (teamsErr || membersErr)?.message });
    }
    return res.status(200).json({ teams, members });
  }

  if (req.method === "POST") {
    const { type, payload } = req.body || {};
    if (type !== "team" && type !== "member") {
      return res.status(400).json({ error: "type must be 'team' or 'member'" });
    }
    const table = type === "team" ? "teams" : "team_members";
    const { data, error } = await admin.from(table).upsert(payload).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  if (req.method === "DELETE") {
    const { type, id } = req.body || {};
    if (type !== "team" && type !== "member") {
      return res.status(400).json({ error: "type must be 'team' or 'member'" });
    }
    const table = type === "team" ? "teams" : "team_members";
    const { error } = await admin.from(table).delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
