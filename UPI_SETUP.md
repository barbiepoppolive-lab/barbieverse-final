# Payment Flow Setup

How payments work on Barbieverse. Customers pay via UPI, then you verify and deliver coins from the admin panel.

## How It Works

1. Customer picks a coin package on **/coins** page
2. Pays via UPI to **thestrongwingsofficial@okaxis**
3. Enters their 12-digit UTR transaction ID
4. Order moves to **paid_pending_delivery** — you get a **Telegram alert**
5. You verify payment in bank app, send coins via Poppo/Vone
6. Go to **Admin → Orders**, click WhatsApp button → send "Coins Credited" message
7. Change order status to **completed**

## Telegram Alerts

You receive instant Telegram alerts for:
- **New coin order** — when customer submits UTR
- **Order completed** — when you mark an order as delivered

Bot token and chat ID are configured in Railway environment variables.

## Admin Panel — One-Click WhatsApp

Go to **Admin → Orders**. Hover over the WhatsApp icon next to any order to see quick message templates:
- **Payment Received** — send after verifying payment
- **Coins Credited** — send after delivering coins
- **Refund Processed** — send if order is rejected
- **Welcome Message** — send to new customers

## Optional: Auto-Verification (MacroDroid)

For automatic payment matching, you can set up **MacroDroid** on a dedicated Android phone with your UPI ID. It forwards payment notifications to:

```
https://barbieverse.org/api/public/upi-webhook
```

This is optional. Manual verification via the admin panel works without MacroDroid.
