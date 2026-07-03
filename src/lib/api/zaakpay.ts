// Zaakpay API Client — Payment link generation and webhook verification
// Docs: https://developer.zaakpay.com/docs/integrating-zaakpay-payment-gateway

import crypto from "crypto";

const ZAAKPAY_BASE_URL = "https://api.zaakpay.com";

function getConfig() {
  const merchantId = process.env.ZAAKPAY_MERCHANT_ID;
  const apiKey = process.env.ZAAKPAY_API_KEY;
  const secretKey = process.env.ZAAKPAY_SECRET_KEY;
  const webhookSecret = process.env.ZAAKPAY_WEBHOOK_SECRET;

  if (!merchantId || !apiKey || !secretKey) {
    throw new Error("Zaakpay credentials not configured");
  }

  return { merchantId, apiKey, secretKey, webhookSecret };
}

// ── Types ──────────────────────────────────────────────

export interface ZaakpayPaymentLinkRequest {
  /** Unique order ID from your system */
  orderId: string;
  /** Amount in paise (e.g., 44900 for ₹449.00) */
  amountPaise: number;
  /** Customer name */
  customerName: string;
  /** Customer email (optional) */
  customerEmail?: string;
  /** Customer phone */
  customerPhone: string;
  /** Payment purpose / description */
  description?: string;
  /** Success redirect URL */
  successUrl?: string;
  /** Failure redirect URL */
  failureUrl?: string;
  /** Webhook URL for payment notification */
  webhookUrl?: string;
}

export interface ZaakpayPaymentLinkResponse {
  success: boolean;
  paymentUrl?: string;
  paymentLinkId?: string;
  error?: string;
}

export interface ZaakpayWebhookPayload {
  /** Zaakpay transaction ID */
  txnId: string;
  /** Your order ID */
  orderId: string;
  /** Amount in paise */
  amount: number;
  /** Payment status: SUCCESS, FAILURE, PENDING */
  status: string;
  /** Payment method used */
  paymentMethod?: string;
  /** UPI transaction reference */
  upiTxnId?: string;
  /** Customer UPI ID */
  payerVpa?: string;
  /** Payment timestamp */
  txnTime?: string;
  /** Webhook signature */
  signature?: string;
}

// ── Create Payment Link ────────────────────────────────

export async function createZaakpayPaymentLink(
  req: ZaakpayPaymentLinkRequest
): Promise<ZaakpayPaymentLinkResponse> {
  const config = getConfig();

  const body = {
    merchantId: config.merchantId,
    orderId: req.orderId,
    amount: req.amountPaise,
    currency: "INR",
    customerName: req.customerName,
    customerEmail: req.customerEmail || "",
    customerPhone: req.customerPhone,
    description: req.description || `Barbieverse Order ${req.orderId}`,
    successUrl: req.successUrl || `${process.env.PUBLIC_APP_URL}/track?order_id=${req.orderId}&whatsapp=${req.customerPhone}`,
    failureUrl: req.failureUrl || `${process.env.PUBLIC_APP_URL}/coins`,
    webhookUrl: req.webhookUrl || `${process.env.PUBLIC_APP_URL}/api/public/zaakpay-webhook`,
  };

  // Generate signature
  const signaturePayload = [
    config.merchantId,
    req.orderId,
    req.amountPaise,
    "INR",
  ].join("|");

  const signature = crypto
    .createHmac("sha256", config.secretKey)
    .update(signaturePayload)
    .digest("hex");

  try {
    const response = await fetch(`${ZAAKPAY_BASE_URL}/v1/payment-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-Signature": signature,
      },
      body: JSON.stringify({ ...body, signature }),
    });

    const data = await response.json();

    if (data.success && data.paymentUrl) {
      return {
        success: true,
        paymentUrl: data.paymentUrl,
        paymentLinkId: data.paymentLinkId,
      };
    }

    return {
      success: false,
      error: data.message || data.error || "Failed to create payment link",
    };
  } catch (e: any) {
    console.error("[zaakpay] createPaymentLink failed:", e?.message);
    return { success: false, error: e?.message || "Network error" };
  }
}

// ── Webhook Signature Verification ─────────────────────

export function verifyZaakpaySignature(
  payload: Record<string, any>,
  signature: string
): boolean {
  const config = getConfig();
  if (!config.webhookSecret) return false;

  // Sort keys and create canonical string
  const canonical = Object.keys(payload)
    .sort()
    .filter((k) => k !== "signature")
    .map((k) => `${k}=${payload[k]}`)
    .join("&");

  const expected = crypto
    .createHmac("sha256", config.webhookSecret)
    .update(canonical)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

// ── Parse Webhook Payload ──────────────────────────────

export function parseZaakpayWebhook(body: any): ZaakpayWebhookPayload | null {
  if (!body || !body.orderId || !body.status) return null;

  return {
    txnId: body.txnId || body.transactionId || "",
    orderId: body.orderId,
    amount: Number(body.amount) || 0,
    status: body.status?.toUpperCase() || "PENDING",
    paymentMethod: body.paymentMethod || "",
    upiTxnId: body.upiTxnId || body.upiTransactionId || "",
    payerVpa: body.payerVpa || body.payer_upi || "",
    txnTime: body.txnTime || body.transactionTime || "",
    signature: body.signature || "",
  };
}
