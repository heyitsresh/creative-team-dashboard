-- Avenue7 Creative Dashboard — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
--
-- Design note: rather than waiting on a roster + SLA spreadsheet, the dashboard
-- ships with an in-app "Team Setup" and "SLA Setup" screen. Whoever manages the
-- dashboard fills those in once; every field autosaves (debounced) the same way
-- the Pendleton dashboard autosaved edits. Swap/edit anytime — no redeploy needed.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Access control helper: only @avenue7media.com (or NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN)
-- Google accounts should be able to read/write. Adjust the domain literal below
-- if you change NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN.
-- ---------------------------------------------------------------------------
create or replace function is_avenue7_user() returns boolean as $$
  select coalesce(auth.jwt() ->> 'email', '') like '%@avenue7media.com';
$$ language sql stable;

-- ---------------------------------------------------------------------------
-- Org chart: teams and members
-- ---------------------------------------------------------------------------
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  name text not null,
  role text,
  -- must match the Jira account email so we can join on assignee
  jira_email text,
  avatar_url text,
  -- hours per week this person is available for queue work (used against SLA hours)
  weekly_capacity_hours numeric not null default 40,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_team_id_idx on team_members(team_id);
create index if not exists team_members_jira_email_idx on team_members(jira_email);

-- ---------------------------------------------------------------------------
-- SLA rules: expected turnaround (in business hours) per Jira label / task type
-- ---------------------------------------------------------------------------
create table if not exists sla_rules (
  id uuid primary key default gen_random_uuid(),
  label text not null unique, -- Jira label, e.g. "Product-Copy", "Storefront"
  display_name text,
  -- Real labor-hours to produce this content type end-to-end (brief -> design
  -- -> QA), sourced from "Standardized Time Logging - Descriptions.xlsx".
  -- Drives the per-person workload/capacity view.
  standard_hours numeric not null default 4,
  -- Calendar-time turnaround before an open task of this type is flagged
  -- overdue. Not the same unit as standard_hours (that's effort, this is
  -- wall-clock) — seeded as a padded multiple of standard_hours, tune freely.
  hours_budget numeric not null default 24,
  description text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Autosaving notes / manual overrides on individual Jira issues (e.g. flag a
-- false positive on an SLA breach, leave a hand-off note). Keyed by issue key
-- so it survives Jira syncs.
-- ---------------------------------------------------------------------------
create table if not exists task_notes (
  issue_key text primary key,
  note text,
  sla_override_hours numeric,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists team_members_set_updated_at on team_members;
create trigger team_members_set_updated_at before update on team_members
  for each row execute procedure set_updated_at();

drop trigger if exists sla_rules_set_updated_at on sla_rules;
create trigger sla_rules_set_updated_at before update on sla_rules
  for each row execute procedure set_updated_at();

drop trigger if exists task_notes_set_updated_at on task_notes;
create trigger task_notes_set_updated_at before update on task_notes
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — any signed-in @avenue7media.com user can read/write.
-- Service-role key (used in API routes) bypasses RLS entirely.
-- ---------------------------------------------------------------------------
alter table teams enable row level security;
alter table team_members enable row level security;
alter table sla_rules enable row level security;
alter table task_notes enable row level security;

create policy "avenue7 read teams" on teams for select using (is_avenue7_user());
create policy "avenue7 write teams" on teams for all using (is_avenue7_user()) with check (is_avenue7_user());

create policy "avenue7 read team_members" on team_members for select using (is_avenue7_user());
create policy "avenue7 write team_members" on team_members for all using (is_avenue7_user()) with check (is_avenue7_user());

create policy "avenue7 read sla_rules" on sla_rules for select using (is_avenue7_user());
create policy "avenue7 write sla_rules" on sla_rules for all using (is_avenue7_user()) with check (is_avenue7_user());

create policy "avenue7 read task_notes" on task_notes for select using (is_avenue7_user());
create policy "avenue7 write task_notes" on task_notes for all using (is_avenue7_user()) with check (is_avenue7_user());

-- ---------------------------------------------------------------------------
-- SLA rules seeded from "Standardized Time Logging - Descriptions.xlsx"
-- (Time Logging Key sheet), matched to the real "CREA: ..." task title
-- templates and Jira labels seen on the CREATE project. standard_hours =
-- sum of every sub-task's logged hours for that task type end-to-end
-- (brief -> design -> QA), taking the "new/full" path where the sheet lists
-- both a new-client and a variation/update path. hours_budget (turnaround)
-- = max(24, standard_hours * 6), a floor-of-one-business-day heuristic —
-- there was no explicit turnaround-SLA column in the sheet, only labor
-- hours, so this is a starting point. Tune both freely in Settings.
-- ---------------------------------------------------------------------------
insert into sla_rules (label, display_name, standard_hours, hours_budget, description)
values
  ('Infographics', 'Infographics', 7.75, 48, 'CREA: Infographics_[PRODUCT] ([ASIN]) — brief, design, QA'),
  ('Product-Copy', 'Product Copy', 1.75, 24, 'CREA: Product Copy_[PRODUCT] ([ASIN]) — new listing copy + QA'),
  ('Listing-Attributes', 'Listing Attributes', 0.5, 24, 'CREA: Listing Attributes_[PRODUCT] ([ASIN])'),
  ('A+ Content', 'A+ Content', 9.75, 58.5, 'CREA: A+ Content_[PRODUCT] ([ASIN]) — brief, design, upload, QA'),
  ('Video', 'Video', 2.75, 24, 'CREA: Video_[PRODUCT] ([ASIN]) — brief, creation, QA'),
  ('Brand-Story', 'Brand Story', 3.25, 24, 'CREA: Brand Story for [BRAND]'),
  ('Storefront', 'Storefront (new / revamp)', 7.5, 45, 'CREA: New/Revamp Storefront - [BRAND]'),
  ('Infographic-Update', 'Infographic Update', 1.0, 24, 'CREA: Infographic Update_[PRODUCT] ([ASIN])'),
  ('Product-Copy-Update', 'Product Copy / Keyword Update', 1.0, 24, 'CREA: Product copy / keyword update [PRODUCT] [ASIN]'),
  ('A+ Update', 'A+ Content Update', 1.0, 24, 'CREA: A+ Update_[PRODUCT] ([ASIN])'),
  ('Storefront-Update', 'Storefront Update', 1.25, 24, 'CREA: Storefront Update for [BRAND]'),
  ('Event-Landing-Page', 'Event/Seasonal Landing Page', 0.75, 24, 'CREA: Event or Seasonal Landing Page for [EVENT] - [BRAND]'),
  ('Size-Charts', 'Size Charts', 1.0, 24, 'CREA: Upload Size Charts for [BRAND]'),
  ('Ad-Creative', 'Ad Creative (Sponsored / DSP)', 1.5, 24, 'CREA: Ad Creative: Sponsored Brands/Display/DSP - [PRODUCT] [(ASIN)]'),
  ('Ad-Video', 'Ad Video', 6.75, 40.5, 'CREA: Ad Video_[PRODUCT] ([ASIN])'),
  ('Internal-Projects', 'Internal Projects', 1.0, 24, 'Heartbeats: internal design task, not client-billable'),
  ('General', 'General / Admin', 1.0, 24, 'Meetings, admin, training — non-client Heartbeats logging')
on conflict (label) do update set
  display_name = excluded.display_name,
  standard_hours = excluded.standard_hours,
  hours_budget = excluded.hours_budget,
  description = excluded.description;

-- ---------------------------------------------------------------------------
-- Org chart seeded from "Avenue7Media - Brand Directory.xlsx" (one tab per
-- Creative Manager = one team here). Roles pulled: Creative Manager, Listing
-- Specialist, Graphic Designer, GD Team Lead, Video Editor — the roles that
-- actually get assigned CREATE tickets per the time-logging sheet.
--
-- jira_email follows the confirmed pattern (first initial + surname
-- @avenue7media.com) for everyone, including "ZQ" (full name: Muhammad
-- Zulqairnain — he's on all 4 teams as GD Team Lead) and Odessa Chavez /
-- Mariam Ahsan, who split the Listing Specialist role for Noor's team only
-- (confirmed — not cross-team like ZQ).
-- ---------------------------------------------------------------------------
insert into teams (name, sort_order)
select v.name, v.sort_order
from (values ('Resh', 0), ('Yain', 1), ('Noor', 2), ('Musa', 3)) as v(name, sort_order)
where not exists (select 1 from teams existing where existing.name = v.name);

insert into team_members (team_id, name, role, jira_email, weekly_capacity_hours, sort_order)
select t.id, m.name, m.role, m.jira_email, 40, m.sort_order
from (values
  ('Resh', 'Resh Tahilramani', 'Creative Manager', 'rtahilramani@avenue7media.com', 0),
  ('Resh', 'Shiela Macapagal', 'Listing Specialist', 'smacapagal@avenue7media.com', 1),
  ('Resh', 'Vannessa Pinlac', 'Graphic Designer', 'vpinlac@avenue7media.com', 2),
  ('Resh', 'Osama Farooq', 'Video Editor', 'ofarooq@avenue7media.com', 3),
  ('Resh', 'Muhammad Zulqairnain', 'GD Team Lead', 'mzulqairnain@avenue7media.com', 4),

  ('Yain', 'Diane (Yain) Yabut', 'Creative Manager', 'dyabut@avenue7media.com', 0),
  ('Yain', 'Mansab Ali', 'Listing Specialist', 'mali@avenue7media.com', 1),
  ('Yain', 'Joseph (Jogs) Magcayang', 'Graphic Designer', 'jmagcayang@avenue7media.com', 2),
  ('Yain', 'Muhammad Zulqairnain', 'GD Team Lead', 'mzulqairnain@avenue7media.com', 3),

  ('Noor', 'Noor Nawab', 'Creative Manager', 'nnawab@avenue7media.com', 0),
  ('Noor', 'Mariam Ahsan', 'Listing Specialist', 'mahsan@avenue7media.com', 1),
  ('Noor', 'Odessa Chavez', 'Listing Specialist', 'ochavez@avenue7media.com', 2),
  ('Noor', 'Jillian Renee Legaspi', 'Graphic Designer', 'jlegaspi@avenue7media.com', 3),
  ('Noor', 'Muhammad Zulqairnain', 'GD Team Lead', 'mzulqairnain@avenue7media.com', 4),

  ('Musa', 'Musa Irfan Mian', 'Creative Manager', 'mmian@avenue7media.com', 0),
  ('Musa', 'Andi Espiritu', 'Listing Specialist', 'aespiritu@avenue7media.com', 1),
  ('Musa', 'Akiblas Flores III', 'Graphic Designer', 'aflores@avenue7media.com', 2),
  ('Musa', 'Muhammad Zulqairnain', 'GD Team Lead', 'mzulqairnain@avenue7media.com', 3)
) as m(team_name, name, role, jira_email, sort_order)
join teams t on t.name = m.team_name
where not exists (
  select 1 from team_members existing
  where existing.team_id = t.id and existing.name = m.name
);

-- If you already ran an earlier version of this file against your Supabase
-- project (teams/members already exist), the inserts above are no-ops
-- (guarded by "where not exists"). Backfill the new emails onto existing
-- rows instead:
update team_members set jira_email = 'rtahilramani@avenue7media.com' where name = 'Resh Tahilramani' and jira_email is null;
update team_members set jira_email = 'smacapagal@avenue7media.com' where name = 'Shiela Macapagal' and jira_email is null;
update team_members set jira_email = 'vpinlac@avenue7media.com' where name = 'Vannessa Pinlac' and jira_email is null;
update team_members set jira_email = 'ofarooq@avenue7media.com' where name = 'Osama Farooq' and jira_email is null;
update team_members set jira_email = 'dyabut@avenue7media.com' where name = 'Diane (Yain) Yabut' and jira_email is null;
update team_members set jira_email = 'mali@avenue7media.com' where name = 'Mansab Ali' and jira_email is null;
update team_members set jira_email = 'jmagcayang@avenue7media.com' where name = 'Joseph (Jogs) Magcayang' and jira_email is null;
update team_members set jira_email = 'nnawab@avenue7media.com' where name = 'Noor Nawab' and jira_email is null;
update team_members set jira_email = 'mahsan@avenue7media.com' where name = 'Mariam Ahsan' and jira_email is null;
update team_members set jira_email = 'jlegaspi@avenue7media.com' where name = 'Jillian Renee Legaspi' and jira_email is null;
update team_members set jira_email = 'mmian@avenue7media.com' where name = 'Musa Irfan Mian' and jira_email is null;
update team_members set jira_email = 'aespiritu@avenue7media.com' where name = 'Andi Espiritu' and jira_email is null;
update team_members set jira_email = 'aflores@avenue7media.com' where name = 'Akiblas Flores III' and jira_email is null;
-- Rename + backfill "ZQ" / "ZQ Zulqarnain" rows from an earlier version of
-- this seed to his confirmed full name and email.
update team_members set name = 'Muhammad Zulqairnain', jira_email = 'mzulqairnain@avenue7media.com' where name in ('ZQ', 'ZQ Zulqarnain');
-- "Mariam Ahsan / Odessa" was one combined row in the very first version of
-- this seed; if that's still in your table, split it manually in
-- Settings -> Team Setup (rename it to "Mariam Ahsan" with
-- mahsan@avenue7media.com, then add a second "Odessa Chavez" row with
-- ochavez@avenue7media.com) rather than running this script again.
update team_members set jira_email = 'ochavez@avenue7media.com' where name = 'Odessa Chavez' and jira_email is null;
update team_members set name = 'Odessa Chavez', jira_email = 'ochavez@avenue7media.com' where name = 'Odessa' and jira_email is null;
