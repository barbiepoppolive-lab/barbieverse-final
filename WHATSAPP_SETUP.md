# WhatsApp Business API Setup Guide

## Step 1: Create Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Create a Business Account (or use existing)
3. Verify your business (takes 1-3 days)

## Step 2: Create WhatsApp Business Account

1. Go to [business.facebook.com](https://business.facebook.com) → WhatsApp Manager
2. Click "Create Account"
3. Add your business name: **Barbieverse**
4. Add phone number (must be dedicated for WhatsApp Business — not used on regular WhatsApp)
5. Verify via SMS or phone call

## Step 3: Create Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "Create App" → Select "Business" type
3. App Name: **Barbieverse WhatsApp**
4. Add WhatsApp product to your app
5. Go to WhatsApp → Getting Started

## Step 4: Get Your Credentials

From the WhatsApp Getting Started page, copy:

1. **Phone Number ID** (e.g., `1234567890`)
2. **Access Token** (click "Generate Token")
   - Use **Permanent Token** for production (Settings → System Users → Generate Token)

## Step 5: Add to Railway

Go to Railway Dashboard → Your Service → Variables → Add:

```
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_ACCESS_TOKEN=your-permanent-access-token
```

## Step 6: Create Message Templates

In Meta Business Manager → WhatsApp Manager → Message Templates, create:

### Template: `welcome_creator`
- Category: Utility
- Language: English
- Body: "Hi {{1}}, welcome to Barbieverse! 🎉 Your {{2}} creator account is being set up. Our team will contact you shortly with your ₹500 bonus details."

### Template: `order_placed`
- Category: Utility
- Language: English
- Body: "Order {{1}} received! {{2}} coins for ₹{{3}}. We're verifying your payment. Coins will be credited within minutes."

### Template: `payment_received`
- Category: Utility
- Language: English
- Body: "Payment confirmed for Order {{1}}! ✅ Our team is sending your coins now."

### Template: `coins_credited`
- Category: Utility
- Language: English
- Body: "🎉 Order {{1}} complete! {{2}} coins credited to your Poppo account. Enjoy streaming!"

### Template: `refund_status`
- Category: Utility
- Language: English
- Body: "Update on Order {{1}}: Refund of {{2}} is {{3}}. Contact support for questions."

### Template: `new_lead_alert` (to admin)
- Category: Utility
- Language: English
- Body: "New creator lead: {{1}} ({{2}}) on {{3}}. Check admin panel."

## Step 7: Submit Templates for Approval

- Templates take 24-48 hours for Meta approval
- You can send messages once approved
- Utility templates are free when replying within 24h of customer message

## Cost (India)

| Message Type | Rate | When |
|-------------|------|------|
| Service (replies within 24h) | **Free** | Customer messaged first |
| Utility (order updates) | ~₹0.115 | Always charged |
| Marketing (promos) | ~₹0.86 | Always charged |

## Testing

1. Add your own phone number as test recipient
2. Send test template from Meta Dashboard
3. Once verified, update code to send to real users
