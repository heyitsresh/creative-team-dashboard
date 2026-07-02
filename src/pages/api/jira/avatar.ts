import type { NextApiRequest, NextApiResponse } from "next";
import { authHeader } from "@/lib/jira";

const SITE = process.env.JIRA_SITE || "ave7.atlassian.net";

function isAllowedHost(hostname: string) {
  return (
    hostname === SITE ||
    hostname.endsWith(".atlassian.net") ||
    hostname.endsWith(".atl-paas.net") ||
    hostname.endsWith("gravatar.com")
  );
}

async function fetchImage(target: string, useAuth: boolean) {
  const headers: Record<string, string> = { Accept: "image/*" };
  if (useAuth) headers.Authorization = authHeader();
  return fetch(target, { headers });
}

/**
 * Proxies Jira avatar images through the server so the browser never needs
 * its own Jira session/credentials to render them.
 *
 * Two earlier attempts at this still left most people on initials:
 * (1) an exact-hostname allowlist that rejected CDN URLs that didn't match
 * the one guessed hostname, and (2) always attaching our API-token auth
 * header. It turns out Jira Cloud typically serves ALL avatars — default
 * generated ones included — from its public avatar CDN, not from an
 * auth-gated site endpoint; sending an unexpected Authorization header to
 * a public CDN can get the request rejected outright. So: try the request
 * unauthenticated first (right for the common case), and only fall back to
 * our Jira credentials if that fails (right for the rarer case where an
 * avatar genuinely is served from the auth-gated site itself).
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

  if (!isAllowedHost(target.hostname)) {
    res.status(400).json({ error: "Host not allowed", hostname: target.hostname });
    return;
  }

  try {
    let upstream = await fetchImage(target.toString(), false);
    if (!upstream.ok) {
      upstream = await fetchImage(target.toString(), true);
    }

    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status).json({
        error: "Upstream avatar fetch failed",
        status: upstream.status,
      });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.status(200).send(buf);
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch avatar", detail: String(err) });
  }
}
