# Barbieverse — Complete Setup Guide

## Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| Website (homepage, blog, join, coins, contact) | ✅ Live | Working at production URL |
| Admin Panel | ✅ Live | Login with admin password |
| Language Toggle (EN/HI) | ✅ Working | 250+ translated keys |
| Sitemap | ✅ Working | Auto-generated |
| Blog Posts | ✅ Working | CRUD via admin |
| Orders | ✅ Working | Database stored |
| Creator Leads | ✅ Working | Database stored |
| WhatsApp Notifications | ⚠️ Needs Setup | Requires Interakt account |
| Email Notifications | ⚠️ Needs Setup | Requires Brevo account |
| UPI Auto-Verification | ⚠️ Needs Setup | Requires Android phone |
| UGC Screenshot AI | ⚠️ Needs Setup | Requires Anthropic API key |

---

## Integration Setup (Priority Order)

### 1. WhatsApp Notifications (Manual — Free)

**What it does:** Sends WhatsApp messages via one-click buttons in admin panel

**How it works:**
1. You get Telegram alert when payment is confirmed
2. Open admin panel → Orders page
3. Hover over WhatsApp button → see quick message options
4. Click a message → opens WhatsApp Web with pre-filled message
5. Hit Send → done!

**Setup (2 minutes):**

1. Set up Telegram bot (see below)
2. Add to Railway:
```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

**See:** WHATSAPP_SETUP.md for step-by-step instructions

---

### 2. Email Notifications (Brevo)

**What it does:** Sends welcome emails to new creator leads

**Setup steps:**

1. Go to [brevo.com](https://www.brevo.com) and create a free account
2. Go to SMTP & API → API Keys → Generate New Key
3. Add to Railway environment variables:
```
BREVO_API_KEY=your-api-key-here
```
4. Run this SQL in Supabase SQL Editor:

```sql
INSERT INTO settings (key, value, category, description) VALUES
('brevo_sender_email', 'hello@barbieverse.org', 'email', 'Sender email address'),
('brevo_sender_name', 'Barbieverse', 'email', 'Sender display name')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

---

### 3. UPI Auto-Verification (MacroDroid)

**What it does:** Automatically verifies UPI payments by detecting payment notifications on an Android phone

**Requirements:**
- Dedicated Android phone (can be old, just needs to work)
- MacroDroid app (free on Play Store)
- UPI app on the phone (Google Pay, PhonePe, etc.)

**Setup steps:**

1. Install MacroDroid on the Android phone
2. Set up a macro:
   - Trigger: Notification → Notification Received → Select your UPI app
   - Action: HTTP Request → POST to your webhook URL
   - Constraint: Notification contains "received" or "credited"
3. Add `UPI_WEBHOOK_SECRET` to Railway environment variables
4. Run this SQL in Supabase SQL Editor:

```sql
INSERT INTO settings (key, value, category, description) VALUES
('upi_webhook_secret', 'YOUR_SECRET_HERE', 'upi', 'Secret for MacroDroid webhook')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

5. Detailed setup guide: Visit `/admin/upi-setup` in your admin panel

---

### 4. UGC Screenshot AI Verification (Anthropic)

**What it does:** Automatically verifies Instagram story screenshots using AI

**Setup steps:**

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create account and add credits ($5 minimum)
3. Generate API key
4. Add to Railway environment variables:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```
5. Create storage bucket in Supabase:
   - Go to Storage section
   - Create new bucket: `ugc-screenshots`
   - Make it public

---

## Environment Variables Reference

### Required (app won't start without)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:password@host:5432/postgres
ADMIN_PASSWORD=your-strong-password
ADMIN_SESSION_SECRET=at-least-32-characters-long
PUBLIC_APP_URL=https://your-domain.com
```

### Optional (features won't work without)
```
BREVO_API_KEY=xxx              # Email notifications
ANTHROPIC_API_KEY=sk-ant-xxx   # UGC AI verification
UPI_WEBHOOK_SECRET=xxx         # UPI auto-verification
INTERAKT_WEBHOOK_SECRET=xxx    # WhatsApp incoming webhooks
```

### Database Settings (set via SQL)
```sql
-- WhatsApp
interakt_webhook = 'your-interakt-webhook-url'
admin_whatsapp = 'your-admin-phone'

-- Email
brevo_sender_email = 'hello@barbieverse.org'
brevo_sender_name = 'Barbieverse'

-- UPI
upi_webhook_secret = 'your-secret'
```

---

## Quick Start Checklist

- [ ] Supabase project created and migrations run
- [ ] Environment variables set in Railway
- [ ] Admin password working at `/admin`
- [ ] Site live at production URL
- [ ] Language toggle working (EN/HI)
- [ ] Blog posts created via admin
- [ ] Hero photo uploaded via admin

**Next steps (when ready):**
- [ ] Interakt account created and webhook configured
- [ ] Brevo account created and API key added
- [ ] Android phone set up with MacroDroid
- [ ] Anthropic API key added for UGC verification
