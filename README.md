# Avenue7 Creative Dashboard

A ground-up rebuild of the creative team's Jira dashboard — new design, new
structure, same proven stack (Next.js 14 Pages Router + Supabase). This is a
new codebase; nothing was copied from the Pendleton dashboard, only the
lessons learned from it (see "Design decisions" below).

## What it does

- **Overview** — top-line snapshot: open tasks, SLA breaches, clients in queue, content-type spread.
- **Clients & Content** — tasks per client and per content type, plus a client × content-type matrix.
- **Team** — org chart that drills down team → member, with live open-task counts per person.
- **Status** — task status breakdown across the whole queue.
- **Queue vs. SLA** — per-person workload (open tasks × SLA hours) against weekly capacity, and a table of tasks ranked by how close/over their SLA budget they are.
- **Alerts** — every open task that has breached its SLA, worst first, with an autosaving note field.
- **Trends** — weekly created-vs-completed throughput and net backlog movement.
- **Client Health** — one card per client: open count, avg. queue time, content mix.
- **Brand Directory** — every brand from `Avenue7Media - Brand Directory.xlsx`, logos included. Team assignment and priority/category/website/notes all autosave here.
- **Settings** — where you build the org chart and set SLA-hour budgets per content type. Every field autosaves (debounced), same pattern the Pendleton dashboard used for shared edits.

## Redeploying after a code update

Most updates to this repo (UI tweaks, new charts, bug fixes) are pure code —
push to GitHub, Vercel auto-redeploys, and nothing else needs to change.
**The one exception is the Brand Directory feature**: it added a new
`clients` table, so before that page will work you need to open your
Supabase project's SQL editor and re-run `supabase/schema.sql` once (it's
safe to re-run in full — every statement is `if not exists` / `on conflict
do nothing`, so it won't touch your existing teams, members, or SLA rules).
After that one-time step, future code-only pushes go back to "just
redeploy."

## Why Settings replaces "send me the roster/SLA sheet"

The dashboard has an in-app **Team Setup** and **SLA Setup** screen
(`/dashboard/settings`) — edit anytime, no redeploy. It's pre-seeded with
real data from two files you sent:

- **Org chart** (`Avenue7Media - Brand Directory.xlsx`) — one team per
  Creative Manager tab (Resh, Yain, Noor, Musa), each with their Listing
  Specialist, Graphic Designer, GD Team Lead, and Video Editor pulled from
  that tab. ZQ shows up on all four teams since the sheet lists him as GD
  Team Lead everywhere — that's real, not a bug.
- **SLA hours** (`Standardized Time Logging - Descriptions.xlsx`) — every
  content type's real labor-hour estimate (brief → design → QA), matched to
  the actual `CREA: ...` task title templates seen in your CREATE project.

Every team member has a Jira email, following the pattern you confirmed
(first initial + surname @avenue7media.com), e.g. `vpinlac@avenue7media.com`
for Vannessa Pinlac. "ZQ" (full name Muhammad Zulqairnain, confirmed) is on
all 4 teams as GD Team Lead — `mzulqairnain@avenue7media.com` throughout.
Noor's team splits the Listing Specialist role between two people (the
brand directory's "Mariam Ahsan/Odessa" notation) — confirmed as Mariam
Ahsan and Odessa Chavez, both scoped to Noor's team only, not cross-team
like ZQ.

## Data model

- **Jira** is the source of truth for tasks. `src/lib/jira.ts` calls `GET
  https://ave7.atlassian.net/rest/api/3/search/jql` with Basic auth
  (`JIRA_EMAIL` + `JIRA_API_TOKEN`), same as the Pendleton dashboard.
- **Client** comes from the `customfield_10866` select field (e.g. `"Dig
  Defence: AMZ"`).
- **Content type** comes from the first Jira **label** on each issue (e.g.
  `Product-Copy`, `Storefront`) — there's no dedicated content-type field in
  Jira today, labels are what's actually populated on CREATE project issues.
- **Supabase** stores everything Jira doesn't have: org chart (`teams`,
  `team_members`), SLA hour budgets (`sla_rules`), and per-issue notes /
  manual SLA overrides (`task_notes`). See `supabase/schema.sql`.

## Assumptions worth knowing about

- **Jira project scope**: `JIRA_PROJECT_KEYS` defaults to `CREATE,CATALO,BGS,METRIC`
  — the Creative project plus the other projects in Jira's "Client
  Engagement" category, since those looked most likely to carry
  creative-adjacent client work. This is a guess based on Jira's project
  categories, not confirmed against real usage — check it and adjust the env
  var (comma-separated project keys) if it's wrong. No code changes needed.
- **SLA hours are two separate numbers per content type**, both editable in
  Settings → SLA Setup: **standard hours** (real labor effort from the
  time-logging sheet — drives the per-person workload/capacity view) and
  **turnaround SLA** (calendar hours before an open task is flagged overdue —
  drives Alerts/Queue). The sheet only gave labor hours, not a turnaround
  target, so turnaround is seeded as `max(24, standard_hours × 6)` — a
  one-business-day floor. That's a starting heuristic, not a real target;
  tune it to whatever your team actually expects.
- **"Completed" in Trends** is a proxy (tasks currently in a Done-category
  status, bucketed by their last-updated week) — Jira's search endpoint
  doesn't return true resolution history without a per-issue changelog call,
  which isn't worth the API load for a dashboard-wide chart.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

### 1. Jira

You already have `JIRA_EMAIL` / `JIRA_API_TOKEN` from the Pendleton project —
reuse them (or mint a fresh token at
https://id.atlassian.com/manage-profile/security/api-tokens). Confirm
`JIRA_PROJECT_KEYS` matches which projects the creative team actually wants
counted.

### 2. Supabase

1. Create a new Supabase project (a fresh one — don't reuse Pendleton's, this
   is a clean start).
2. In the SQL editor, run `supabase/schema.sql`.
3. Project Settings → API: copy the **Project URL**, **anon public key**, and
   **service_role key** into `.env.local` / Vercel env vars.
4. Authentication → Providers → enable **Google**, and set the authorized
   redirect URL Supabase gives you in your Google Cloud OAuth client.
5. Authentication → URL Configuration: set the Site URL to your Vercel
   deployment URL once you have one.

### 3. Google OAuth (for the @avenue7media.com login gate)

1. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application).
2. Add Supabase's callback URL (shown on the Google provider setup screen in
   Supabase) as an authorized redirect URI.
3. Paste the Client ID/secret into Supabase's Google provider settings.
4. `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=avenue7media.com` is enforced twice —
   once client-side for UX, once via Postgres RLS (`is_avenue7_user()` in
   `schema.sql`) so it's not just a client-side gate.

## Deploying to Vercel

This repo is ready to push and deploy — no Vercel/GitHub credentials were
used to build it, so the deploy step is on your end:

1. Push this folder to a new GitHub repo.
2. In Vercel: **New Project** → import that repo.
3. Add all variables from `.env.example` as Vercel environment variables
   (Production + Preview).
4. Deploy. Framework preset should auto-detect as Next.js.
5. Once deployed, go back to Supabase → Authentication → URL Configuration
   and set the Site URL / redirect URL to your `*.vercel.app` (or custom)
   domain.

## Tech

- Next.js 14 (Pages Router) + TypeScript
- Supabase (Postgres + Auth + RLS) for the org chart, SLA rules, and notes
- SWR for client-side data fetching/polling
- Recharts for charts
- Tailwind CSS — light lavender-white app body with white rounded-2xl cards,
  purple/indigo primary accent, pastel content-type tags, and a dark sidebar
  with white hover states (same sidebar treatment as the other Jira
  dashboard build), plus light animation throughout (route fades, count-up
  stat numbers, staggered card/list entrances, hover lift on cards)
- lucide-react for icons
