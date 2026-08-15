-- Lock down the WhatsApp tables.
--
-- WHY: these five tables hold lead phone numbers and the full text of every
-- conversation. With RLS off, anyone holding the publishable ("anon") key can
-- read and modify every row — and that key ships inside the website's own
-- JavaScript, so it is public by definition. Nothing is exposed yet only
-- because the tables are still empty.
--
-- WHAT THIS DOES: turns RLS on with NO permissive policies for anon or
-- authenticated. That denies both roles completely. It does NOT break the app:
-- every WhatsApp code path runs server-side through SUPABASE_DB_URL / the
-- service role, and the service role bypasses RLS by design.
--
-- If a future browser-side admin page needs to read these, add a narrow policy
-- for the authenticated role then — not now.

alter table wa_leads    enable row level security;
alter table wa_messages enable row level security;
alter table wa_drafts   enable row level security;
alter table wa_events   enable row level security;
alter table wa_answers  enable row level security;

-- Also force RLS for the table owner, so a mistakenly-owner-scoped connection
-- cannot quietly read around it.
alter table wa_leads    force row level security;
alter table wa_messages force row level security;
alter table wa_drafts   force row level security;
alter table wa_events   force row level security;
alter table wa_answers  force row level security;

-- Belt and braces: revoke the default grants Supabase hands to the public API
-- roles, so even a future permissive policy can't accidentally open these up.
revoke all on wa_leads, wa_messages, wa_drafts, wa_events, wa_answers
  from anon, authenticated;

comment on table wa_leads is
  'RLS ON, no anon/authenticated policies. Server-side access only via the
   service role. Contains lead phone numbers — treat as personal data.';
