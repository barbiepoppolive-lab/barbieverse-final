-- Update homepage carousel slide links
-- Run this in Supabase SQL Editor

-- Update "Learn More" slides to link to the new blog post
UPDATE carousel_slides
SET button_link = '/blog/how-to-earn-money-on-poppo-live-india'
WHERE button_text ILIKE '%learn more%'
  AND carousel_type = 'homepage_feature';

-- Update "Claim Advantage" slides to link to Poppo New Host Mission
UPDATE carousel_slides
SET button_link = '/blog/poppo-new-host-mission-explained'
WHERE button_text ILIKE '%claim advantage%'
  AND carousel_type = 'homepage_feature';

-- Update "Join Agency" slides to link to Why Join Barbieverse
UPDATE carousel_slides
SET button_link = '/blog/why-join-barbieverse'
WHERE button_text ILIKE '%join agency%'
  AND carousel_type = 'homepage_feature';

-- Verify changes
SELECT id, title, button_text, button_link FROM carousel_slides WHERE carousel_type = 'homepage_feature';
