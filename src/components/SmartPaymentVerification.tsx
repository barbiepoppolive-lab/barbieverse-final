import { useState, useCallback } from "react";
import { confirmPayment } from "@/lib/api/confirm-payment.server";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Copy,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Wallet,
} from "lucide-react";

interface SmartPaymentVerificationProps {
  upiId: string;
  payeeName: string;
  amountRupees: string;
  orderId: string;
  orderShortId: string;
  customerName: string;
  customerWhatsapp: string;
  poppoId: string;
  packageName: string;
  quantity: number;
  totalCoins: number;
  whatsappNumber: string;
  onBack: () => void;
  onDone: () => void;
}

export function SmartPaymentVerification({
  upiId,
  payeeName,
  amountRupees,
  orderId,
  orderShortId,
  customerName,
  customerWhatsapp,
  poppoId,
  packageName,
  quantity,
  totalCoins,
  onBack,
  onDone,
}: SmartPaymentVerificationProps) {
  const [utr, setUtr] = useState("");
  const [guide, setGuide] = useState<"gpay" | "phonepe" | "paytm" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const confirmFn = useServerFn(confirmPayment);

  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amountRupees}&cu=INR&tn=BV-${orderShortId}`;

  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );

  const utrValid = utr.trim().length >= 12 && /^[A-Za-z0-9]+$/.test(utr.trim());

  const copy = (v: string, k: string) => {
    navigator.clipboard.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };

  const openUPI = () => {
    window.location.href = upiLink;
  };

  const handleConfirm = useCallback(async () => {
    if (!utrValid) return;
    setSubmitting(true);
    try {
      const res: any = await confirmFn({
        data: {
          order_id: orderId,
          utr: utr.trim(),
          verified_via: "manual_entry",
          customer_name: customerName,
          customer_whatsapp: customerWhatsapp,
          poppo_id: poppoId,
          package_name: packageName,
          quantity,
          amount_rupees: amountRupees,
          total_coins: totalCoins,
        },
      });
      if (res?.ok) {
        setSuccess(true);
        onDone();
      }
    } finally {
      setSubmitting(false);
    }
  }, [orderId, utr, customerName, customerWhatsapp, poppoId, packageName, quantity, amountRupees, totalCoins, confirmFn, onDone, utrValid]);

  if (success) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-primary/30 bg-card/60 p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-bold">Payment Confirmed!</h2>
        <p className="mt-3 text-muted-foreground">
          We're verifying your payment now. You'll get a WhatsApp confirmation shortly.
        </p>
        <button
          onClick={onDone}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-gradient-pink px-6 text-sm font-bold text-primary-foreground"
        >
          Done
        </button>
      </div>
    );
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md space-y-5">
        {/* Header */}
        <div className="text-center">
          <h3 className="font-display text-xl font-bold">Pay ₹{amountRupees} via UPI</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isMobile ? "Tap below to open your UPI app" : "Scan QR code or copy UPI ID to pay"}
          </p>
        </div>

        {/* Desktop: QR Code */}
        {!isMobile && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border/60 bg-background/40 p-6">
            <img src={qrSrc} alt="UPI QR Code" className="h-64 w-64 rounded-xl bg-white p-2" />
            <div className="text-center text-xs text-muted-foreground">Scan with any UPI app</div>
          </div>
        )}

        {/* UPI Details */}
        <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-4">
          <CopyRow label="UPI ID" value={upiId} k="upi" copied={copied} onCopy={copy} />
          <CopyRow label="Amount" value={`₹${amountRupees}`} k="amt" copied={copied} onCopy={copy} />
          <CopyRow label="Note" value={`BV-${orderShortId}`} k="note" copied={copied} onCopy={copy} />
        </div>

        {/* Mobile: Open UPI button */}
        {isMobile && (
          <button
            onClick={openUPI}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-pink text-base font-bold text-primary-foreground glow-pink transition-transform hover:scale-[1.02]"
          >
            <Smartphone className="h-5 w-5" />
            Open UPI App
          </button>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-xs font-semibold text-muted-foreground uppercase">After paying, enter UTR below</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        {/* UTR Guide */}
        <div>
          <div className="mb-2 text-xs font-semibold text-muted-foreground">How to find your UTR:</div>
          <div className="flex gap-2">
            {[
              { id: "gpay" as const, label: "GPay", icon: CreditCard },
              { id: "phonepe" as const, label: "PhonePe", icon: Wallet },
              { id: "paytm" as const, label: "Paytm", icon: Smartphone },
            ].map((app) => (
              <button
                key={app.id}
                onClick={() => setGuide(guide === app.id ? null : app.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  guide === app.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary"
                }`}
              >
                <app.icon className="h-3.5 w-3.5" />
                {app.label}
              </button>
            ))}
          </div>
          {guide && (
            <div className="mt-3 rounded-xl border border-border/60 bg-secondary/40 p-4 text-xs text-muted-foreground">
              <div className="mb-2 font-semibold text-foreground">
                {guide === "gpay" && "How to find UTR in GPay:"}
                {guide === "phonepe" && "How to find UTR in PhonePe:"}
                {guide === "paytm" && "How to find UTR in Paytm:"}
              </div>
              {guide === "gpay" && (
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Open GPay → tap your profile icon</li>
                  <li>Tap "See all payments" or "View transaction history"</li>
                  <li>Find the ₹{amountRupees} payment</li>
                  <li>Tap it → scroll down → find "UPI transaction ID" or "UPI Ref No"</li>
                  <li>Copy the 12-digit number</li>
                </ol>
              )}
              {guide === "phonepe" && (
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Open PhonePe → tap "History" at bottom</li>
                  <li>Find the ₹{amountRupees} payment</li>
                  <li>Tap it → find "Transaction ID" or "UPI Ref No"</li>
                  <li>Copy the 12-digit number</li>
                </ol>
              )}
              {guide === "paytm" && (
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Open Paytm → tap "Balance & History"</li>
                  <li>Find the ₹{amountRupees} payment</li>
                  <li>Tap it → find "UPI Transaction ID"</li>
                  <li>Copy the 12-digit number</li>
                </ol>
              )}
            </div>
          )}
        </div>

        {/* UTR Input */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            12-digit transaction ID <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 30))}
              placeholder="Enter UTR number"
              className={`h-11 w-full rounded-lg border bg-input/50 px-3 pr-10 text-sm font-mono focus:outline-none ${
                utr.length > 0 && utrValid
                  ? "border-primary"
                  : utr.length > 0
                    ? "border-destructive"
                    : "border-input"
              }`}
            />
            {utrValid && (
              <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            )}
          </div>
          {utr.length > 0 && !utrValid && (
            <p className="mt-1 text-xs text-destructive">Minimum 12 characters, alphanumeric only</p>
          )}
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!utrValid || submitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground glow-pink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirm Payment
        </button>

        <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          UTR is auto-verified. You'll get a WhatsApp confirmation within minutes.
        </div>
      </div>
    </div>
  );
}

function CopyRow({
  label,
  value,
  k,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  k: string;
  copied: string | null;
  onCopy: (v: string, k: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2">
      <div className="text-xs">
        <div className="text-muted-foreground">{label}</div>
        <div className="font-mono font-semibold break-all">{value}</div>
      </div>
      <button
        type="button"
        onClick={() => onCopy(value, k)}
        className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:border-primary"
      >
        {copied === k ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        {copied === k ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
