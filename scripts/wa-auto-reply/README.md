# WhatsApp Auto-Reply Bot

FREE WhatsApp bot using whatsapp-web.js. No Meta API, no paid service.

## How It Works

1. Connects to WhatsApp via QR code (like WhatsApp Web)
2. Listens for incoming messages
3. Matches canned answers (70-80% of messages)
4. Uses LLM for uncanned messages (if OPENROUTER_API_KEY set)
5. Auto-replies in Barbie's voice

## Setup (Local)

```bash
cd scripts/wa-auto-reply
npm install
npm start
```

1. Scan the QR code with WhatsApp → Linked Devices → Link a Device
2. Bot is now live and auto-replying

## Deploy to Railway

### Option 1: Separate Service (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init wa-bot

# Set environment variables
railway variables set WA_APPROVE_MODE=canned-auto
railway variables set OPENROUTER_API_KEY=your_key_here

# Deploy from this directory
cd scripts/wa-auto-reply
railway up
```

### Option 2: Docker

```bash
cd scripts/wa-auto-reply
docker build -t wa-bot .
docker run -d \
  -v $(pwd)/.wwebjs_auth:/app/.wwebjs_auth \
  -e WA_APPROVE_MODE=canned-auto \
  -e OPENROUTER_API_KEY=your_key \
  --name wa-bot \
  wa-bot
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WA_APPROVE_MODE` | `canned-auto` | `canned-auto`, `all-auto`, or `all-manual` |
| `OPENROUTER_API_KEY` | (none) | For LLM replies to uncanned messages |

## First Run

1. Run `npm start`
2. QR code appears in terminal
3. Open WhatsApp → Linked Devices → Link a Device
4. Scan the QR code
5. Bot connects and starts listening

Session is saved to `.wwebjs_auth/` — you only scan once.

## Files

- `index.ts` — Main bot script
- `answer-bank.ts` — Canned answers (14 Q&As)
- `test.ts` — Test script
- `Dockerfile` — For Railway/Docker deployment

# deploy marker: 2026-08-16T04:14:50Z
