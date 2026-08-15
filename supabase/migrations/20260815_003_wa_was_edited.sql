-- Metric correctness: track whether a draft's final send was edited by hand.
-- The unedited-send rate is the metric that says when a stage is safe to
-- auto-send. Without this flag, an edited draft that gets sent records as
-- "sent" with final_text == draft_text and counts as unedited — wrong.

alter table wa_drafts add column if not exists was_edited boolean default false;
