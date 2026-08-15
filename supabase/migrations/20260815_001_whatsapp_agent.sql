-- WhatsApp lead agent — tables
-- Built from the 15 Aug 2026 chat analysis: 75 lead conversations, 59 of which died
-- in silence with zero follow-ups ever sent. The follow_up_due column is the fix.

-- ── conversations ──────────────────────────────────────────────────────────
create table if not exists wa_leads (
  id                uuid primary key default gen_random_uuid(),
  phone             text not null unique,          -- E.164, no '+', e.g. 919876543210
  display_name      text,
  stage             text not null default 'NEW',
  -- NEW · ASKED · LINK_SENT · INSTALLING · INSTALLED
  -- AGENCY_LINKED ★ · FACE_VERIFIED ★ · FIRST_LIVE ★ · ACTIVE
  -- side exits: STALLED · ESCALATED · NOT_INTERESTED
  language          text default 'hinglish',        -- hi | en | hinglish
  source            text,                           -- which ad / reel
  prefill_variant   text,                           -- which ad pre-filled msg arrived

  hours_per_day     text,                           -- her answer to the qualifying question
  topics_asked      text[] default '{}',            -- so we never repeat an answer

  last_inbound_at   timestamptz,
  last_outbound_at  timestamptz,
  window_expires_at timestamptz,                    -- last_inbound + 24h (free-reply window)
  follow_up_due     timestamptz,                    -- the single most important column here
  follow_up_count   int default 0,
  escalated         boolean default false,
  escalated_reason  text,
  human_takeover    boolean default false,

  agency_verified_at timestamptz,                   -- ★ screenshot checked by Barbie
  face_verified_at   timestamptz,                   -- ★
  first_live_at      timestamptz,                   -- ★
  creator_lead_id    uuid,                          -- link to existing creator_leads

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists wa_leads_stage_idx      on wa_leads(stage);
create index if not exists wa_leads_followup_idx   on wa_leads(follow_up_due) where follow_up_due is not null;
create index if not exists wa_leads_window_idx     on wa_leads(window_expires_at);

-- ── every message, in and out ──────────────────────────────────────────────
create table if not exists wa_messages (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references wa_leads(id) on delete cascade,
  direction         text not null check (direction in ('in','out')),
  provider_msg_id   text unique,                    -- idempotency: providers retry
  body              text,
  media_url         text,
  media_type        text,
  template_name     text,                           -- null = free-form session message
  status            text default 'received',        -- queued/sent/delivered/read/failed
  cost_paise        int default 0,
  created_at        timestamptz default now()
);

create index if not exists wa_messages_lead_idx on wa_messages(lead_id, created_at desc);

-- ── drafts: the training set that tells us when auto-send is safe ──────────
create table if not exists wa_drafts (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references wa_leads(id) on delete cascade,
  trigger_text      text,                           -- what she said
  source            text,                           -- 'canned:Q3' | 'llm' | 'followup:day1'
  draft_text        text not null,
  final_text        text,                           -- what actually got sent
  media_tag         text,                           -- e.g. '05-withdrawal-850'
  compliance        jsonb,                          -- gate result
  decision          text,                           -- sent | edited | skipped | takeover
  telegram_msg_id   text,
  decided_at        timestamptz,
  created_at        timestamptz default now()
);

-- ── funnel events ──────────────────────────────────────────────────────────
create table if not exists wa_events (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references wa_leads(id) on delete cascade,
  event       text not null,                        -- stage_change | conversion | escalation
  from_stage  text,
  to_stage    text,
  meta        jsonb,
  created_at  timestamptz default now()
);

create index if not exists wa_events_lead_idx on wa_events(lead_id, created_at);

-- ── answer bank: editable without redeploying ──────────────────────────────
create table if not exists wa_answers (
  id           text primary key,                    -- 'Q1' ... 'Q10'
  label        text not null,
  match_any    text[] not null,                     -- regex fragments that trigger it
  reply_hi     text not null,                       -- Hinglish (primary)
  reply_en     text,
  media_tag    text,
  next_nudge   text,                                -- the "then say this" line
  active       boolean default true,
  updated_at   timestamptz default now()
);

comment on table wa_answers is
  'Answers extracted from Barbie''s own 1,516 messages. Edit here, not in code.
   Two corrections baked in: withdrawal is $10/~Rs850 (she once told a lead Rs10,000),
   and the word "guarantee" is banned (she promised a guaranteed 30k to a real lead).';
