-- WhatsApp agent — approve-loop additions
-- Adds a flag so the ✍️ Edit handshake survives restarts: when Barbie taps
-- Edit, we set edit_pending = true; her next text from the same chat becomes
-- the replacement, which is then re-compliance-checked before sending.

alter table wa_drafts add column if not exists edit_pending boolean default false;

create index if not exists wa_drafts_pending_idx on wa_drafts(edit_pending) where edit_pending;