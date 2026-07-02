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

// A tiny generated SVG standing in for a failed avatar fetch, showing the
// actual HTTP status code(s) we got back. Three previous fix attempts each
// guessed at the cause (host allowlist, auth header placement) and shipped
// blind because a failed fetch just silently fell back to plain initials in
// the UI — there was no way to tell WHY it failed without server log access.
// This makes every failure self-diagnosing directly on the dashboard: the
// little colored circle that used to just be initials will show a status
// code instead, so we can fix the real cause on the next pass instead of
// guessing a 4th time.
function diagnosticSvg(label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="24" fill="#FBE3EC"/>
    <text x="24" y="28" font-family="monospace" font-size="11" fill="#C23B73" text-anchor="middle">${label}</text>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * Proxies Jira avatar images through the server so the browser never needs
 * its own Jira session/credentials to render them.
 *
 * Three earlier attempts at this still left most people on initials, each
 * shipped without being able to see the actual upstream error: (1) an
 * exact-hostname allowlist that rejected CDN URLs that didn't match the one
 * guessed hostname, (2) always attaching our API-token auth header, (3)
 * unauthenticated-first with an authenticated fallback. If this round still
 * doesn't fix it, the diagnosticSvg fallback below will at least show real
 * status codes on the dashboard instead of silently falling back to
 * initials, so the next fix is based on evidence instead of a guess.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (typeof url !== "string") {
    res.setHeader("Content-Type", "image/svg+xml");
    res.status(200).send(diagnosticSvg("no-url"));
    return;
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    res.setHeader("Content-Type", "image/svg+xml");
    res.status(200).send(diagnosticSvg("bad-url"));
    return;
  }

  if (!isAllowedHost(target.hostname)) {
    res.setHeader("Content-Type", "image/svg+xml");
    res.status(200).send(diagnosticSvg("host"));
    return;
  }

  try {
    const attempt1 = await fetchImage(target.toString(), false);
    if (attempt1.ok && attempt1.body) {
      const contentType = attempt1.headers.get("content-type") || "image/png";
      const buf = Buffer.from(await attempt1.arrayBuffer());
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.status(200).send(buf);
      return;
    }

    const status1 = attempt1.status;
    const attempt2 = await fetchImage(target.toString(), true);
    if (attempt2.ok && attempt2.body) {
      const contentType = attempt2.headers.get("content-type") || "image/png";
      const buf = Buffer.from(await attempt2.arrayBuffer());
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.status(200).send(buf);
      return;
    }

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(diagnosticSvg(`${status1}/${attempt2.status}`));
  } catch (err) {
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(diagnosticSvg("err"));
  }
}
