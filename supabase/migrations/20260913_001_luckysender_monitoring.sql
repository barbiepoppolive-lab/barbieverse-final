-- LuckySender real-time monitoring — devices, heartbeats, sessions
-- Depends on: none (new feature)

-- ── Devices ──────────────────────────────────────────────────────

create table if not exists luckysender_devices (
  id                uuid primary key default gen_random_uuid(),
  device_id         text unique not null,
  device_name       text,
  device_model      text,
  device_brand      text,
  app_version       text default '1.0',
  last_heartbeat    timestamptz,
  status            text default 'offline'
                      check (status in ('online','tapping','idle','offline','error')),
  balance           bigint default 0,
  total_taps        integer default 0,
  total_host_earnings bigint default 0,
  total_gift_cost   bigint default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ── Sessions ─────────────────────────────────────────────────────

create table if not exists luckysender_sessions (
  id                uuid primary key default gen_random_uuid(),
  device_id         text not null references luckysender_devices(device_id),
  session_id        bigint,
  started_at        timestamptz,
  ended_at          timestamptz,
  tap_mode          integer,
  total_taps        integer default 0,
  total_wins        integer default 0,
  win_rate          real,
  total_gift_cost   bigint default 0,
  total_host_earnings bigint default 0,
  balance_start     bigint,
  balance_end       bigint,
  balance_change    bigint,
  net_profit        bigint,
  stop_reason       text,
  created_at        timestamptz default now()
);

-- ── Heartbeats ───────────────────────────────────────────────────

create table if not exists luckysender_heartbeats (
  id                uuid primary key default gen_random_uuid(),
  device_id         text not null references luckysender_devices(device_id),
  balance           bigint,
  taps_total        integer,
  taps_session      integer,
  win_rate          real,
  status            text,
  poppo_running     boolean default false,
  uptime_ms         bigint,
  sent_at           timestamptz default now()
);

-- ── Indexes ──────────────────────────────────────────────────────

create index if not exists ls_devices_device_id on luckysender_devices(device_id);
create index if not exists ls_sessions_device_id on luckysender_sessions(device_id);
create index if not exists ls_sessions_created on luckysender_sessions(created_at desc);
create index if not exists ls_heartbeats_device on luckysender_heartbeats(device_id);
create index if not exists ls_heartbeats_sent on luckysender_heartbeats(sent_at desc);

-- ── RLS ──────────────────────────────────────────────────────────

alter table luckysender_devices enable row level security;
alter table luckysender_sessions enable row level security;
alter table luckysender_heartbeats enable row level security;

create policy "service role only" on luckysender_devices
  for all using (true) with check (true);
create policy "service role only" on luckysender_sessions
  for all using (true) with check (true);
create policy "service role only" on luckysender_heartbeats
  for all using (true) with check (true);
