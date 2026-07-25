-- Fix email warmup data loss: email_send_log never stored the actual message,
-- so queued (warmup-throttled) emails could never actually be resent later —
-- processQueuedEmails() was just flipping status to 'sent' without sending.
-- Store enough to resend: recipient name + full HTML body.

ALTER TABLE email_send_log
  ADD COLUMN IF NOT EXISTS to_name      TEXT,
  ADD COLUMN IF NOT EXISTS html_content TEXT;
