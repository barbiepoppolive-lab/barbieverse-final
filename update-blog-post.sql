-- Update blog post: earn-500-bonus-poppo-live → new content about ₹1,150 week one mission
UPDATE posts 
SET 
  title = 'How New Poppo Hosts Earn ₹1,150 Guaranteed In Their First Week',
  slug = 'earn-1150-first-week-poppo-live',
  excerpt = 'New Poppo hosts can earn ₹1,150 (female) or ₹575 (male) guaranteed in their first week by completing the Solo Live Mission. Here''s exactly how it works.',
  content = E'## What Is The Poppo Solo Live Mission?\n\nPoppo Live offers a guaranteed earning mission for new hosts. When you join as a new creator, you can earn **₹1,150 (female creators)** or **₹575 (male creators)** in your first week — no audience required.\n\n## How It Works\n\n1. **Stream 2 hours daily** for 7 consecutive days\n2. Complete **face authentication** on your Poppo account\n3. Reach **Level 5** on your Poppo profile\n4. Poppo pays you **20,000 points ($2) daily** — totalling $14 (₹1,150) in week one\n\n## Gender-Based Earnings\n\n| Creator Type | Week 1 Earnings | Daily Task |\n|-------------|----------------|------------|\n| Female Host | ₹1,150 | 20,000 pts/day × 7 days |\n| Male Host | ₹575 | 10,000 pts/day × 7 days |\n\n## Requirements\n\n- **Level 5 account** — achieved through consistent streaming\n- **Face authentication** — one-time verification\n- **2 hours daily streaming** — can be split into sessions\n- **7 consecutive days** — must not miss a day\n\n## What Happens After Week 1?\n\nAfter completing the first week mission, you continue earning through:\n- Daily task rewards\n- Viewer gifts and donations\n- PK battles with other creators\n- Agency bonuses and support\n\n## How BarbieVerse Helps\n\nWhen you join through BarbieVerse:\n- We guide you through the Level 5 setup\n- Help with face authentication\n- Provide streaming tips to maintain daily streaks\n- Offer WhatsApp support in Hindi & English\n\n**Ready to start?** [Join BarbieVerse](/join) and begin your creator journey today.',
  category = 'Poppo Tips and Tricks',
  updated_at = NOW()
WHERE slug = 'earn-500-bonus-poppo-live';

-- If the old slug doesn't exist, insert the new post
INSERT INTO posts (title, slug, excerpt, content, category, published, created_at, updated_at)
SELECT 
  'How New Poppo Hosts Earn ₹1,150 Guaranteed In Their First Week',
  'earn-1150-first-week-poppo-live',
  'New Poppo hosts can earn ₹1,150 (female) or ₹575 (male) guaranteed in their first week by completing the Solo Live Mission. Here''s exactly how it works.',
  E'## What Is The Poppo Solo Live Mission?\n\nPoppo Live offers a guaranteed earning mission for new hosts. When you join as a new creator, you can earn **₹1,150 (female creators)** or **₹575 (male creators)** in your first week — no audience required.\n\n## How It Works\n\n1. **Stream 2 hours daily** for 7 consecutive days\n2. Complete **face authentication** on your Poppo account\n3. Reach **Level 5** on your Poppo profile\n4. Poppo pays you **20,000 points ($2) daily** — totalling $14 (₹1,150) in week one\n\n## Gender-Based Earnings\n\n| Creator Type | Week 1 Earnings | Daily Task |\n|-------------|----------------|------------|\n| Female Host | ₹1,150 | 20,000 pts/day × 7 days |\n| Male Host | ₹575 | 10,000 pts/day × 7 days |\n\n## Requirements\n\n- **Level 5 account** — achieved through consistent streaming\n- **Face authentication** — one-time verification\n- **2 hours daily streaming** — can be split into sessions\n- **7 consecutive days** — must not miss a day\n\n## What Happens After Week 1?\n\nAfter completing the first week mission, you continue earning through:\n- Daily task rewards\n- Viewer gifts and donations\n- PK battles with other creators\n- Agency bonuses and support\n\n## How BarbieVerse Helps\n\nWhen you join through BarbieVerse:\n- We guide you through the Level 5 setup\n- Help with face authentication\n- Provide streaming tips to maintain daily streaks\n- Offer WhatsApp support in Hindi & English\n\n**Ready to start?** [Join BarbieVerse](/join) and begin your creator journey today.',
  'Poppo Tips and Tricks',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'earn-1150-first-week-poppo-live');
