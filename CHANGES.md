 # BarbieVerse — Update Changelog
## June 2026

---

## 🗄️ Database Migrations (Run in order in Supabase SQL Editor)

### 1. `20260613_001_creator_acquisition.sql`
- Adds `intent`, `ugc_screenshot_url`, `ugc_verified`, `ugc_submitted_at`, `segment_priority` columns to `creator_leads`
- Creates `settings` table for admin-configurable values
- Creates `creator_leads_logs` audit table
- Seeds default intent options, referral URLs, WhatsApp message templates

### 2. `20260613_002_recharge_fixes.sql`
- Adds `admin_notes`, `refund_status`, `refunded_at`, `refund_notes`, `utr_submitted_at` to `orders`
- Creates `order_status_logs` audit table with auto-trigger
- Adds WhatsApp message settings for USDT/NetBanking confirmation and refunds

---

## 📁 New Files

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/use-motion.ts` | Motion primitives: scroll reveal, parallax, tilt, reduced-motion detection |

### Components
| File | Purpose |
|------|---------|
| `src/components/ParticleCanvas.tsx` | Canvas particle system (pink/purple glow dots) |
| `src/components/FloatingOrbs.tsx` | Glass orb decoratives + sparkle dots |
| `src/components/Reveal.tsx` | Scroll-triggered reveal wrapper |
| `src/components/TiltCard.tsx` | 3D tilt on hover with glare effect |

### Routes
| File | Purpose |
|------|---------|
| `src/routes/verify.tsx` | `/verify` page — UGC screenshot upload & AI validation |
| `src/routes/track.tsx` | `/track` page — public order tracking for customers |

### API
| File | Purpose |
|------|---------|
| `src/lib/api/settings.functions.ts` | Admin-configurable settings (referral URLs, intent options, WhatsApp messages) |
| `src/lib/api/ugc-validation.functions.ts` | Claude Vision AI screenshot validation |

---

## ✏️ Modified Files

| File | Changes |
|------|---------|
| `src/styles.css` | Premium CSS appended: glass, glow, tilt, float, shimmer, scroll-progress, stagger utilities |
| `src/routes/index.tsx` | Premium hero with parallax, particles, tilt cards, scroll reveals. Same data, same routes |
| `src/components/SiteHeader.tsx` | Scroll-aware header, animated nav underline, smooth mobile menu |
| `src/lib/api/orders.functions.ts` | Added: `submitUtr`, `trackOrder`, `updateOrderNotes`, `updateRefundStatus` |
| `src/routes/admin.orders.tsx` | Added: admin notes, refund flow (3-step), UTR visibility, expandable rows |
| `src/lib/api/creator-leads.functions.ts` | Added: intent field, UGC submission, `approveCreatorReward` |
| `src/lib/api/settings.functions.ts` | New file replacing existing — adds full settings management |

---

## 🔑 Environment Variables Required

Add to your `.env.local` / deployment environment:

```bash
# Required for AI screenshot validation
ANTHROPIC_API_KEY=sk-ant-...

# Already set in your project
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# For WhatsApp notifications
INTERAKT_API_KEY=...

# For order tracking links in WhatsApp messages
PUBLIC_APP_URL=https://barbieverse.org
```

---

## 🪣 Supabase Storage Bucket Required

Create a public bucket called `ugc-screenshots` in your Supabase project:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('ugc-screenshots', 'ugc-screenshots', true);

CREATE POLICY "public can upload ugc" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'ugc-screenshots');

CREATE POLICY "public can read ugc" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'ugc-screenshots');
```

---

## 🚀 Setup Order

1. Run `20260613_001_creator_acquisition.sql` in Supabase SQL Editor
2. Run `20260613_002_recharge_fixes.sql` in Supabase SQL Editor
3. Create `ugc-screenshots` storage bucket
4. Set `ANTHROPIC_API_KEY` environment variable
5. Set `PUBLIC_APP_URL` environment variable
6. Deploy code
7. Test:
   - Homepage loads with animations
   - `/join` → intent selection → form → redirect works
   - `/verify` → screenshot upload → AI validation works
   - `/track` → order tracking works
   - `/admin/creator-leads` → shows leads + approve button
   - `/admin/orders` → shows notes + refund controls

---

## 🔁 Revert Instructions

If you need to revert any change:

**Revert premium UI only** (keep functionality):
- Replace `src/routes/index.tsx` with your git backup
- Replace `src/components/SiteHeader.tsx` with your git backup
- Remove the appended CSS from `src/styles.css` (below the original 139 lines)
- Delete: `src/hooks/use-motion.ts`, `src/components/ParticleCanvas.tsx`, `src/components/FloatingOrbs.tsx`, `src/components/Reveal.tsx`, `src/components/TiltCard.tsx`

**Revert recharge fixes**:
- Replace `src/lib/api/orders.functions.ts` with git backup
- Replace `src/routes/admin.orders.tsx` with git backup
- Delete `src/routes/track.tsx`
- The DB columns added are non-breaking (nullable) — no need to remove them

**Revert creator acquisition**:
- Replace `src/lib/api/creator-leads.functions.ts` with git backup
- Delete `src/routes/verify.tsx`
- Delete `src/lib/api/ugc-validation.functions.ts`

---

## 🔒 Security Audit Fixes (2026-06-13)

### Migration: `20260613_003_order_auto_expiry.sql` **NEW — MUST RUN**
- Adds `expires_at` column to `orders` (auto-set to 24h after creation)
- Adds `expired_at` column (set when order auto-expires)
- Creates `auto_expire_orders()` function for periodic cleanup
- Creates trigger to auto-set `expires_at` on new orders

### Code Changes

| Area | What Changed |
|------|-------------|
| **Admin session** | Hardcoded fallback secret removed — now throws error if `ADMIN_SESSION_SECRET` not set with 32+ chars |
| **DB SSL** | Defaults to `rejectUnauthorized: true` (secure). Set `DB_SSL_INSECURE=true` or `NODE_ENV=development` for local |
| **Login brute-force** | Added in-memory IP-based rate limiter: 5 attempts per 15 min |
| **Timing attack fix** | Password comparison now uses `crypto.timingSafeEqual()` |
| **UPI window** | Increased from 45 min → **24 hours** (both matching + generation) |
| **Pagination** | All list endpoints now accept `page` + `pageSize` params with defaults |
| **Settings split** | `getPublicSettings()` = public-safe keys only. `getSettings()` + `getAllSettings()` = admin-only |
| **Webhook replay** | Added in-memory idempotency dedup (60s window) for UPI + Interakt webhooks |
| **Order auto-expiry** | `expires_at` set on all new orders (24h). Migration adds cleanup function |
| **TypeScript types** | Added missing columns to `orders` and `creator_leads` types |

---

## 🚀 Setup Order (Updated)

1. Run `20260613_001_creator_acquisition.sql` in Supabase SQL Editor
2. Run `20260613_002_recharge_fixes.sql` in Supabase SQL Editor
3. **Run `20260613_003_order_auto_expiry.sql` in Supabase SQL Editor** ← NEW
4. Create `ugc-screenshots` storage bucket
5. Set all environment variables (see below)
6. Deploy code

---

## 🔑 Complete Environment Variables

```bash
# ── Database ───────────────────────────────────────────
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
SUPABASE_DB_URL=postgresql://postgres:xxx@xxx:6543/postgres

# ── Auth / Session ─────────────────────────────────────
ADMIN_PASSWORD=your-strong-admin-password
ADMIN_SESSION_SECRET=your-32-plus-char-session-secret-minimum

# ── Webhooks ───────────────────────────────────────────
UPI_WEBHOOK_SECRET=your-upi-webhook-secret
INTERAKT_WEBHOOK_SECRET=your-interakt-webhook-secret

# ── AI Verification ────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ── Notifications ──────────────────────────────────────
INTERAKT_API_KEY=xxx
BREVO_API_KEY=xxx
PUBLIC_APP_URL=https://barbieverse.org

# ── Optional ───────────────────────────────────────────
# DB_SSL_INSECURE=true     # Only for local dev without proper SSL cert
```

---

## ⚡ Performance Notes

- Zero new npm dependencies added
- Particle canvas capped at 30fps, disabled on low-power devices
- All animations respect `prefers-reduced-motion`
- Tilt/parallax use `requestAnimationFrame` with `cancelAnimationFrame` cleanup
- Images: `loading="eager"` on hero only, lazy elsewhere
- `willChange` applied only during animation, removed after
- Lighthouse target: >90 Performance, >95 Best Practices
