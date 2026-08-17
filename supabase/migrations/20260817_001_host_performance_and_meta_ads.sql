-- Host performance tracking + Meta Ads attribution tables
-- Depends on: 20260815_001_whatsapp_agent.sql (wa_leads)

-- ── Host performance ────────────────────────────────────────────────────────
-- Tracks earnings, rank, hours streamed for converted hosts.
-- Sources: CSV import from Vone dashboard, vision-extracted from screenshots,
-- or self-reported by the host.
create table if not exists host_performance (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null references wa_leads(id) on delete cascade,
  period_start       date,
  period_end         date,
  hours_streamed     numeric,
  gifts_value        numeric,
  rank               text,
  earnings_estimate  numeric,
  source             text not null check (source in ('csv_import', 'vision_extracted', 'self_report')),
  raw_screenshot_url text,
  confidence         text default 'low' check (confidence in ('high', 'low')),
  created_at         timestamptz default now()
);

create index if not exists host_performance_lead_idx on host_performance(lead_id);
create index if not exists host_performance_period_idx on host_performance(period_start, period_end);

-- ── Meta Ads — campaign metadata ────────────────────────────────────────────
create table if not exists meta_ad_campaigns (
  id           text primary key,        -- Meta's campaign id
  name         text not null,
  objective    text,
  status       text,
  created_at   timestamptz default now()
);

-- ── Meta Ads — ad creatives (one row per ad) ────────────────────────────────
-- prefill_variant MUST match wa_leads.prefill_variant for the attribution join.
create table if not exists meta_ad_creatives (
  id               text primary key,    -- Meta's ad id
  campaign_id      text references meta_ad_campaigns(id),
  prefill_variant  text not null,       -- MUST match wa_leads.prefill_variant
  prefill_text     text,
  language         text,
  headline         text,
  image_url        text,
  created_at       timestamptz default now()
);

create index if not exists meta_ad_creatives_variant_idx on meta_ad_creatives(prefill_variant);

-- ── Meta Ads — daily insights (one row per ad per day) ──────────────────────
create table if not exists meta_ad_insights_daily (
  date             date not null,
  campaign_id      text references meta_ad_campaigns(id),
  ad_id            text references meta_ad_creatives(id),
  spend            numeric,
  impressions      integer,
  clicks           integer,
  ctr              numeric,
  cpm              numeric,
  cpc              numeric,
  results          integer,             -- Meta's self-reported "lead" count
  cost_per_result  numeric,
  primary key (date, ad_id)
);

-- ── RLS policies ────────────────────────────────────────────────────────────
-- Same pattern as wa_leads: service role only (admin dashboard + bot writes).
alter table host_performance enable row level security;
alter table meta_ad_campaigns enable row level security;
alter table meta_ad_creatives enable row level security;
alter table meta_ad_insights_daily enable row level security;

create policy "service role only" on host_performance for all using (true) with check (true);
create policy "service role only" on meta_ad_campaigns for all using (true) with check (true);
create policy "service role only" on meta_ad_creatives for all using (true) with check (true);
create policy "service role only" on meta_ad_insights_daily for all using (true) with check (true);
