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

/**
 * Proxies Jira avatar images through the server so the browser never needs
 * its own Jira session/credentials to render them. Without this, only
 * people with a custom-uploaded photo (served from Atlassian's public
 * avatar CDN, whatever its exact subdomain happens to be) would show a real
 * picture — everyone on Jira's default generated avatar (served from the
 * Jira site itself, which IS auth-gated) would 403 and silently fall back
 * to initials.
 *
 * Host matching is suffix-based (*.atlassian.net / *.atl-paas.net /
 * gravatar.com) rather than an exact-hostname allowlist — an earlier
 * version hardcoded one guessed CDN hostname, which rejected every photo
 * that didn't match it exactly (a regression: those photos loaded fine
 * before this proxy existed, since there was no allowlist at all then).
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
    res.status(400).json({ error: "Host not allowed" });
    return;
  }

  // Only the Jira site itself needs our API credentials — its default
  // generated avatars live behind the same auth as the rest of the REST
  // API. The avatar CDN and Gravatar are already public; attaching an
  // unexpected Authorization header there could just as easily get the
  // request rejected as help it.
  const headers: Record<string, string> = { Accept: "image/*" };
  if (target.hostname === SITE) {
    headers.Authorization = authHeader();
  }

  try {
    const upstream = await fetch(target.toString(), { headers });

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
