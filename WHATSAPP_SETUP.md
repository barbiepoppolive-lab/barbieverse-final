# WhatsApp Setup — Manual One-Click (Recommended)

No Facebook account needed! WhatsApp messages are sent manually by admin via one-click buttons.

## How It Works

1. **Admin gets Telegram alert** when payment is confirmed
2. **Admin opens admin panel** → Orders page
3. **Admin hovers over WhatsApp button** → sees quick message options
4. **Admin clicks a message** → opens WhatsApp Web with pre-filled message
5. **Admin hits Send** → done!

## Setup (2 Minutes)

### Step 1: Set Up Telegram Bot (Free)

1. Open Telegram, search for `@BotFather`
2. Send `/newbot`
3. Name your bot (e.g., `Barbieverse Alerts`)
4. Copy the **bot token** (e.g., `123456:ABC-DEF...`)
5. Add to Railway: `TELEGRAM_BOT_TOKEN=your_token`

### Step 2: Get Your Chat ID

1. Send any message to your new bot on Telegram
2. Open browser, go to: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find `"chat":{"id":` in the response — that's your chat ID
4. Add to Railway: `TELEGRAM_CHAT_ID=your_chat_id`

### Step 3: Done!

Now when someone pays, you'll get a Telegram alert like:

```
🎀 NEW COIN ORDER CONFIRMED

👤 Customer: Priya
📱 WhatsApp: 919876543210
🎮 Poppo ID: 12345678
📦 Package: 1000 Coins
💰 Amount: ₹190
🔑 UTR: 123456789010

⚡ Send 1000 coins now!
```

Then open admin panel → Orders → hover WhatsApp button → click the appropriate message → send!

## Advantages

- **100% Free** — no API costs
- **No Facebook account** — no Meta verification needed
- **Instant Telegram alerts** — you know immediately when payment arrives
- **One-click WhatsApp** — pre-filled messages, just hit send
- **Personal touch** — customer gets a real WhatsApp message from you
