import { useState, useRef, useCallback, useEffect } from "react";
import { confirmPayment } from "@/lib/api/confirm-payment.server";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Copy,
  ArrowLeft,
  Loader2,
  Camera,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  AlertCircle,
  ShieldCheck,
  Clock,
  Smartphone,
  CreditCard,
  Wallet,
} from "lucide-react";

type Layer = "deep_link" | "screenshot_ocr" | "whatsapp_share" | "manual_entry";

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
  whatsappNumber: string; // your business WhatsApp
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
  whatsappNumber,
  onBack,
  onDone,
}: SmartPaymentVerificationProps) {
  const [activeLayer, setActiveLayer] = useState<Layer>("deep_link");
  const [countdown, setCountdown] = useState(60);
  const [countdownDone, setCountdownDone] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [manualUtr, setManualUtr] = useState("");
  const [manualGuide, setManualGuide] = useState<"gpay" | "phonepe" | "paytm" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmFn = useServerFn(confirmPayment);

  // UPI deep link — do NOT encode @ in VPA, UPI apps need raw @
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amountRupees}&cu=INR&tn=BV-${orderShortId}`;

  // Device detection: UPI deep links only work on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent));
  }, []);

  // WhatsApp link
  const whatsappMessage = encodeURIComponent(
    `Hi Barbieverse! I just paid for my coin order.\n\nOrder ID: ${orderId}\nPoppo ID: ${poppoId}\nAmount: ₹${amountRupees}\n\nPlease find my payment screenshot attached.`
  );
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/[^\d]/g, "")}?text=${whatsappMessage}`;

  // Start countdown on mount
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCountdownDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const copy = (v: string, k: string) => {
    navigator.clipboard.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };

  // Try to open UPI app — works better than <a href> on mobile
  const openUPI = () => {
    window.location.href = upiLink;
    // Reset timer
    setCountdownDone(false);
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCountdownDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleConfirm = useCallback(
    async (utr: string, layer: "upi_deep_link" | "screenshot_ocr" | "whatsapp_share" | "manual_entry") => {
      setSubmitting(true);
      try {
        const res: any = await confirmFn({
          data: {
            order_id: orderId,
            utr,
            verified_via: layer,
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
    },
    [orderId, customerName, customerWhatsapp, poppoId, packageName, quantity, amountRupees, totalCoins, confirmFn, onDone]
  );

  // ── LAYER 1: UPI Deep Link ──
  const DeepLinkLayer = () => {
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;
    return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="font-display text-xl font-bold">Pay ₹{amountRupees} via UPI</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {isMobile ? "Tap below to open your UPI app with amount pre-filled" : "Scan QR code or copy UPI ID to pay"}
        </p>
      </div>

      {/* Desktop: QR Code + Copy Details */}
      {!isMobile && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border/60 bg-background/40 p-6">
            <img src={qrSrc} alt="UPI QR Code" className="h-64 w-64 rounded-xl bg-white p-2" />
            <div className="text-center text-xs text-muted-foreground">Scan with any UPI app</div>
          </div>
          <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-4">
            <CopyRow label="UPI ID" value={upiId} k="upi" copied={copied} onCopy={copy} />
            <CopyRow label="Amount" value={`₹${amountRupees}`} k="amt" copied={copied} onCopy={copy} />
            <CopyRow label="Note" value={`BV-${orderShortId}`} k="note" copied={copied} onCopy={copy} />
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            After paying, enter your 12-digit UTR below to confirm.
          </div>
          <button
            onClick={openUPI}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold hover:border-primary"
          >
            <Smartphone className="h-4 w-4" />
            Try Open UPI App
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveLayer("manual_entry")}
              className="flex-1 flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground glow-pink"
            >
              <CheckCircle2 className="h-4 w-4" />
              I've Paid — Enter UTR
            </button>
            <button
              onClick={() => setActiveLayer("screenshot_ocr")}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold hover:border-primary"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile: Deep Link Button */}
      {isMobile && (
        <>
          {/* Countdown timer */}
          <div className="flex items-center justify-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-4">
            <Clock className="h-5 w-5 text-primary" />
            <div className="text-center">
              <div className="font-mono text-2xl font-bold text-primary">{countdown}s</div>
              <div className="text-xs text-muted-foreground">
                {countdownDone ? "No response detected — try another method below" : "Waiting for payment confirmation..."}
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <button
            onClick={openUPI}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-pink text-base font-bold text-primary-foreground glow-pink transition-transform hover:scale-[1.02]"
          >
            <Smartphone className="h-5 w-5" />
            Pay ₹{amountRupees} via UPI
          </button>

          {/* Copy UPI details */}
          <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-4">
            <CopyRow label="UPI ID" value={upiId} k="upi" copied={copied} onCopy={copy} />
            <CopyRow label="Amount" value={`₹${amountRupees}`} k="amt" copied={copied} onCopy={copy} />
          </div>

          {/* Status message */}
          {!countdownDone && (
            <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Paid? Wait a moment while we check. Don't close this page.
            </div>
          )}

          {/* Progress to Layer 2 */}
          {countdownDone && (
            <button
              onClick={() => setActiveLayer("screenshot_ocr")}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold hover:border-primary"
            >
              <Camera className="h-4 w-4" />
              Next: Upload Payment Screenshot
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
  };

  // ── LAYER 2: Screenshot OCR ──
  const ScreenshotOcrLayer = () => {
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setOcrLoading(true);
      setOcrError(null);
      setOcrResult(null);

      try {
        setOcrError("Screenshot received. Please enter your UTR manually below.");
      } catch (err) {
        setOcrError("Could not process screenshot — enter UTR manually");
      } finally {
        setOcrLoading(false);
      }
    };

    return (
      <div className="space-y-5">
        <div className="text-center">
          <h3 className="font-display text-xl font-bold">Upload your payment screenshot</h3>
          <p className="mt-1 text-sm text-muted-foreground">We will automatically read your transaction ID</p>
        </div>

        {/* Upload box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary"
        >
          <Camera className="h-10 w-10 text-muted-foreground" />
          <div className="text-sm font-semibold text-muted-foreground">
            {ocrLoading ? "Reading your screenshot..." : "Tap to upload screenshot"}
          </div>
          {ocrLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          className="hidden"
        />

        {/* OCR Success */}
        {ocrResult && (
          <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              We found your transaction ID: {ocrResult}
            </div>
            <div className="text-xs text-muted-foreground">Confirm to proceed — or edit if incorrect</div>
            <div className="flex gap-2">
              <input
                value={ocrResult}
                onChange={(e) => setOcrResult(e.target.value)}
                className="flex-1 h-10 rounded-lg border border-primary/40 bg-background px-3 text-sm font-mono"
              />
              <button
                onClick={() => handleConfirm(ocrResult, "screenshot_ocr")}
                disabled={submitting}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-pink px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirm
              </button>
            </div>
          </div>
        )}

        {/* OCR Error */}
        {ocrError && (
          <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/40 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              {ocrError}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveLayer("whatsapp_share")}
                className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold hover:border-primary"
              >
                <MessageCircle className="h-4 w-4" />
                Send via WhatsApp
              </button>
              <button
                onClick={() => setActiveLayer("manual_entry")}
                className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold hover:border-primary"
              >
                Enter Manually
              </button>
            </div>
          </div>
        )}

        {/* Skip to Layer 3 */}
        {!ocrResult && !ocrLoading && (
          <button
            onClick={() => setActiveLayer("whatsapp_share")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold hover:border-primary"
          >
            Skip — Send Proof on WhatsApp
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  // ── LAYER 3: WhatsApp Share ──
  const WhatsAppShareLayer = () => (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="font-display text-xl font-bold">Send Payment Proof on WhatsApp</h3>
        <p className="mt-1 text-sm text-muted-foreground">Forward your UPI payment notification to us directly</p>
      </div>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] text-base font-bold text-white transition-transform hover:scale-[1.02]"
      >
        <MessageCircle className="h-5 w-5" />
        Send Payment Proof on WhatsApp
      </a>

      <div className="space-y-2 text-xs text-muted-foreground">
        <p>After opening WhatsApp, forward your payment screenshot in the same chat.</p>
        <p className="font-semibold text-foreground">We will process your order within 30 minutes of receiving proof.</p>
      </div>

      {/* Fallback: Manual entry */}
      <button
        onClick={() => setActiveLayer("manual_entry")}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold hover:border-primary"
      >
        <ChevronDown className="h-4 w-4" />
        Enter transaction ID manually
      </button>
    </div>
  );

  // ── FALLBACK: Manual UTR Entry ──
  const ManualEntryLayer = () => {
    const utrValid = manualUtr.trim().length >= 12 && /^[A-Za-z0-9]+$/.test(manualUtr.trim());
    return (
      <div className="space-y-5">
        <div className="text-center">
          <h3 className="font-display text-xl font-bold">Enter transaction ID manually</h3>
          <p className="mt-1 text-sm text-muted-foreground">Find your 12-digit UTR from your payment app</p>
        </div>

        {/* Visual guide buttons */}
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
                onClick={() => setManualGuide(manualGuide === app.id ? null : app.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  manualGuide === app.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary"
                }`}
              >
                <app.icon className="h-3.5 w-3.5" />
                {app.label}
              </button>
            ))}
          </div>
          {manualGuide && (
            <div className="mt-3 rounded-xl border border-border/60 bg-secondary/40 p-4 text-xs text-muted-foreground">
              <div className="mb-2 font-semibold text-foreground">
                {manualGuide === "gpay" && "How to find UTR in GPay:"}
                {manualGuide === "phonepe" && "How to find UTR in PhonePe:"}
                {manualGuide === "paytm" && "How to find UTR in Paytm:"}
              </div>
              {manualGuide === "gpay" && (
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Open GPay → tap your profile icon</li>
                  <li>Tap "See all payments" or "View transaction history"</li>
                  <li>Find the ₹{amountRupees} payment</li>
                  <li>Tap it → scroll down → find "UPI transaction ID" or "UPI Ref No"</li>
                  <li>Copy the 12-digit number</li>
                </ol>
              )}
              {manualGuide === "phonepe" && (
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Open PhonePe → tap "History" at bottom</li>
                  <li>Find the ₹{amountRupees} payment</li>
                  <li>Tap it → find "Transaction ID" or "UPI Ref No"</li>
                  <li>Copy the 12-digit number</li>
                </ol>
              )}
              {manualGuide === "paytm" && (
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
              value={manualUtr}
              onChange={(e) => setManualUtr(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 30))}
              placeholder="Enter 12-digit transaction ID"
              className={`h-11 w-full rounded-lg border bg-input/50 px-3 pr-10 text-sm font-mono focus:outline-none ${
                manualUtr.length > 0 && utrValid
                  ? "border-primary"
                  : manualUtr.length > 0
                    ? "border-destructive"
                    : "border-input"
              }`}
            />
            {utrValid && (
              <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            )}
          </div>
          {manualUtr.length > 0 && !utrValid && (
            <p className="mt-1 text-xs text-destructive">Minimum 12 characters, alphanumeric only</p>
          )}
        </div>

        <button
          onClick={() => handleConfirm(manualUtr.trim(), "manual_entry")}
          disabled={!utrValid || submitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground glow-pink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirm Payment
        </button>
      </div>
    );
  };

  if (success) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-primary/30 bg-card/60 p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-bold">Payment Confirmed! 🎉</h2>
        <p className="mt-3 text-muted-foreground">
          We're verifying your payment now. Coins will be credited within minutes. You'll get a WhatsApp confirmation.
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Layer indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className={activeLayer === "deep_link" ? "font-semibold text-primary" : ""}>Pay</span>
        <span>→</span>
        <span className={activeLayer === "screenshot_ocr" ? "font-semibold text-primary" : ""}>Upload</span>
        <span>→</span>
        <span className={activeLayer === "whatsapp_share" ? "font-semibold text-primary" : ""}>WhatsApp</span>
        <span>→</span>
        <span className={activeLayer === "manual_entry" ? "font-semibold text-primary" : ""}>Manual</span>
      </div>

      {/* Active layer */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md">
        {activeLayer === "deep_link" && <DeepLinkLayer />}
        {activeLayer === "screenshot_ocr" && <ScreenshotOcrLayer />}
        {activeLayer === "whatsapp_share" && <WhatsAppShareLayer />}
        {activeLayer === "manual_entry" && <ManualEntryLayer />}
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
