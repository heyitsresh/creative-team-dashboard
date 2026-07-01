import type { NextApiRequest, NextApiResponse } from "next";
import { authHeader } from "@/lib/jira";

const SITE = process.env.JIRA_SITE || "ave7.atlassian.net";

// Atlassian hosts avatars in a couple of places: the Jira site itself
// (default/generated avatars — these require the same auth as the REST API)
// and its public avatar CDN (custom-uploaded photos — technically public,
// but we proxy those too for a consistent, same-origin <img src>).
const ALLOWED_HOSTS = new Set([
  SITE,
  "avatar-management--avatars.us-east-1.prod.public.atl-paas.net",
  "secure.gravatar.com",
]);

/**
 * Proxies Jira avatar images through the server so the browser never needs
 * its own Jira session/credentials to render them. Without this, only
 * people with a custom-uploaded photo (served from Atlassian's public CDN)
 * would show a real picture — everyone on Jira's default generated avatar
 * (served from the Jira site itself, which is auth-gated) would 403 and
 * silently fall back to initials.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (typeof url !== "string") {
    res.status(400).json({ error: "Missing url" });
    return;
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    res.status(400).json({ error: "Host not allowed" });
    return;
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Authorization: authHeader(), Accept: "image/*" },
    });

    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status).end();
      return;
    }

    const contentType = upstream.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.status(200).send(buf);
  } catch {
    res.status(502).json({ error: "Failed to fetch avatar" });
  }
}
