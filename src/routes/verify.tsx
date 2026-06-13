// src/routes/verify.tsx
// UGC Screenshot Verification Page

import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitUgcScreenshot } from "@/lib/api/creator-leads.functions";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify Your Story — Claim ₹500 | BarbieVerse" },
      {
        name: "description",
        content: "Upload your Instagram story screenshot showing Poppo/Vone app and tag @barbieverse to verify your ₹500 reward.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const [step, setStep] = useState<"form" | "uploading" | "success" | "error">("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submit = useServerFn(submitUgcScreenshot);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please upload an image file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("Image must be less than 10MB");
        return;
      }
      setUploadedFile(file);
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!mobileNumber.trim()) {
      setErrorMessage("Please enter your mobile number");
      return;
    }

    if (!uploadedFile) {
      setErrorMessage("Please select a screenshot");
      return;
    }

    setStep("uploading");

    try {
      // Upload file to Supabase storage
      const { supabase } = await import("@/integrations/supabase/client");
      const fileName = `ugc/${Date.now()}_${uploadedFile.name}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from("ugc-screenshots")
        .upload(fileName, uploadedFile);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("ugc-screenshots")
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error("Could not get file URL");
      }

      // Submit for validation
      const result = await submit({
        data: {
          mobile_number: mobileNumber,
          screenshot_url: urlData.publicUrl,
        },
      });

      if ((result as any)?.ok) {
        setStep("success");
        setSuccessMessage("Screenshot verified! Your ₹500 reward is pending admin approval. You'll receive a WhatsApp confirmation soon.");
        setUploadedFile(null);
        setMobileNumber("");
      } else {
        setStep("error");
        const errorData = result as any;
        const reason = errorData.error || "Could not verify screenshot";
        setErrorMessage(reason);
      }
    } catch (err: any) {
      setStep("error");
      setErrorMessage(err.message || "An error occurred. Please try again.");
    }
  };

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-12 lg:py-20">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
              <Upload className="h-3.5 w-3.5" /> Verification Required
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-5xl">
              Verify Your Story
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Complete one final step to claim your <span className="text-gradient-pink font-semibold">₹500 reward</span>
            </p>
          </div>

          {/* Main content */}
          <div className="mt-12">
            {step === "form" && (
              <form
                onSubmit={handleSubmit}
                className="space-y-6 rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-md"
              >
                <div>
                  <h2 className="font-display text-xl font-bold mb-2">Instructions</h2>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Post an Instagram story showing the Poppo Live or Vone Live app</li>
                    <li>Tag <span className="text-primary font-semibold">@barbieverse</span> in your story</li>
                    <li>Take a screenshot of your story</li>
                    <li>Upload the screenshot below</li>
                  </ol>
                </div>

                <div className="border-t border-border/40 pt-6">
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Your Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-11 rounded-lg border border-input bg-input/50 px-3 text-sm focus:border-primary focus:outline-none"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must match the number you used when joining
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Screenshot of Your Story *
                  </label>

                  {uploadedFile ? (
                    <div className="space-y-3">
                      <div className="relative rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-2xl">
                            📸
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{uploadedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(uploadedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUploadedFile(null)}
                            className="text-xs text-destructive hover:text-destructive/80 font-semibold"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border-2 border-dashed border-border/60 p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="font-semibold text-foreground">Click to upload or drag</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG or GIF (Max 10MB)
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    required
                  />
                </div>

                {errorMessage && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={step === "uploading" || !uploadedFile || !mobileNumber}
                  className="w-full h-11 rounded-lg bg-gradient-pink font-semibold text-white hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {step === "uploading" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  )}
                  {step === "form" && "Submit Screenshot"}
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  Your screenshot will be verified automatically using AI. No false positives.
                </p>
              </form>
            )}

            {step === "success" && (
              <div className="rounded-2xl border border-primary/30 bg-card/60 p-8 text-center backdrop-blur-md">
                <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
                <h2 className="font-display text-2xl font-bold text-foreground">Screenshot Verified! ✅</h2>
                <p className="mt-3 text-muted-foreground">
                  {successMessage}
                </p>
                <div className="mt-6 space-y-2 rounded-lg bg-secondary/50 p-4 text-left">
                  <p className="font-semibold text-sm">What happens next?</p>
                  <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
                    <li>Your reward is pending admin verification</li>
                    <li>You'll receive WhatsApp confirmation when approved</li>
                    <li>₹500 will be sent to your UPI ID</li>
                  </ol>
                </div>
                <button
                  onClick={() => window.location.href = "/"}
                  className="mt-6 h-11 rounded-lg bg-gradient-pink font-semibold text-white hover:shadow-lg transition-all"
                >
                  Return to Home
                </button>
              </div>
            )}

            {step === "error" && (
              <div className="rounded-2xl border border-destructive/30 bg-card/60 p-8 text-center backdrop-blur-md">
                <AlertCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
                <h2 className="font-display text-2xl font-bold text-foreground">Verification Failed</h2>
                <p className="mt-3 text-muted-foreground text-sm">
                  {errorMessage}
                </p>
                <button
                  onClick={() => setStep("form")}
                  className="mt-6 h-11 rounded-lg bg-gradient-pink font-semibold text-white hover:shadow-lg transition-all"
                >
                  Try Again
                </button>
                <p className="mt-4 text-xs text-muted-foreground">
                  Need help? WhatsApp Barbie for assistance.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
