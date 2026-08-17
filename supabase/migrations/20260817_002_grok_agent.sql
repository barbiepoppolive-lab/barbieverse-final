-- Grok agent: conversation state, observability, compaction
-- Depends on: 20260815_001_whatsapp_agent.sql, 20260817_001_host_performance_and_meta_ads.sql

-- ── Conversation state columns on wa_leads ───────────────────────────────────
-- These extend the existing pipeline stage (wa_leads.stage) with a parallel
-- conversation-warmth layer. Pipeline stage = where she is in the funnel;
-- conversation_stage = how warm the conversation currently is.

alter table wa_leads add column if not exists conversation_stage text default 'NEW';
  -- NEW/CURIOUS/QUALIFYING/INTERESTED/WARM/HIGH_INTENT/READY_TO_JOIN/JOINING/JOINED/HUMAN_HANDOFF/LOST/FOLLOW_UP

alter table wa_leads add column if not exists lead_score integer default 0;
  -- 0-100, Grok-maintained via tool call

alter table wa_leads add column if not exists streaming_experience text;
  -- free text, Grok-extracted: "none", "streamed on Poppo for 3 months", etc.

alter table wa_leads add column if not exists current_platform text;
  -- competitor platform she's mentioned, if any

alter table wa_leads add column if not exists trust_level text;
  -- low / medium / high, Grok-assessed

alter table wa_leads add column if not exists objection_count integer default 0;

alter table wa_leads add column if not exists conversation_summary text;
  -- 1-2 sentence rolling summary, Grok-maintained

alter table wa_leads add column if not exists next_best_action text;
  -- Grok's note to itself / to a human

-- ── Compaction state ─────────────────────────────────────────────────────────
alter table wa_leads add column if not exists grok_compaction_blob text;
  -- opaque encrypted_content from xAI Context Compaction API

alter table wa_leads add column if not exists grok_compaction_updated_at timestamptz;

-- ── Observability: Grok interactions log ─────────────────────────────────────
-- One row per LLM call. No message body stored (that's in wa_messages).
-- Keeps this table small and avoids duplicating sensitive content.
create table if not exists grok_interactions (
  id                        uuid primary key default gen_random_uuid(),
  lead_id                   uuid references wa_leads(id) on delete cascade,
  conversation_stage_before text,
  conversation_stage_after  text,
  model                     text,          -- 'grok-4.20-0309-non-reasoning' or 'grok-4.6'
  reasoning_effort          text,          -- null for Tier 1, 'low' for Tier 2
  input_tokens              integer,
  cached_tokens             integer,
  output_tokens             integer,
  reasoning_tokens          integer,
  tool_calls                jsonb,         -- [{name, args, result}] if any
  latency_ms                integer,
  error                     text,
  human_handoff             boolean default false,
  converted_this_turn       boolean default false,
  created_at                timestamptz default now()
);

create index if not exists grok_interactions_lead_idx on grok_interactions(lead_id);
create index if not exists grok_interactions_created_idx on grok_interactions(created_at);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table grok_interactions enable row level security;
create policy "service role only" on grok_interactions for all using (true) with check (true);
