// Verify Page — Creator UGC Screenshot Verification
// Creators upload their Instagram story screenshot here

import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { submitUgcScreenshot } from "@/lib/api/creator-leads.functions";
import {
  Upload, CheckCircle, XCircle, AlertCircle, ArrowLeft,
  Instagram, Image, Loader2, Shield, ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify Screenshot | BarbieVerse" },
      {
        name: "description",
        content: "Upload your Instagram story screenshot to verify and earn your creator reward.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const [mobile, setMobile] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!mobile.trim() || !screenshotUrl.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await submitUgcScreenshot({
        data: {
          mobile_number: mobile.trim(),
          screenshot_url: screenshotUrl.trim(),
        },
      });
      setResult(res);
    } catch (err: any) {
      setResult({ ok: false, error: err.message || "Submission failed" });
    }

    setSubmitting(false);
  };

  const handleFileSelect = (file: File) => {
    // Convert to data URL for preview (note: server needs a hosted URL)
    // For now, show the file and ask user to provide a hosted URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setScreenshotUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-lg">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold">Verify Your Story</h1>
            <p className="mt-2 text-muted-foreground">
              Upload your Instagram story screenshot showing @barbieverse tag
            </p>
          </div>

          {/* Requirements */}
          <div className="mb-6 rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur-md">
            <h3 className="mb-3 font-semibold text-foreground">Screenshot must show:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-400" />
                Instagram story or post with app UI visible
              </li>
              <li className="flex items-center gap-2">
                <Image className="h-4 w-4 text-purple-400" />
                Poppo Live or Vone Live app mentioned
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                @barbieverse tagged or mentioned
              </li>
            </ul>
          </div>

          {/* Form */}
          {!result ? (
            <div className="space-y-5 rounded-xl border border-border/60 bg-card/60 p-6 backdrop-blur-md">
              {/* Mobile Number */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Registered Mobile Number
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Screenshot URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Screenshot URL
                </label>
                <input
                  type="url"
                  value={screenshotUrl.startsWith("data:") ? "" : screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  placeholder="https://i.imgur.com/your-screenshot.png"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload to{" "}
                  <a
                    href="https://imgur.com/upload"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Imgur
                  </a>{" "}
                  and paste the direct image link
                </p>
              </div>

              {/* File Upload Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Or drag & drop an image here
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 5MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              {/* Preview */}
              {screenshotUrl && (
                <div className="rounded-lg border border-border bg-background p-2">
                  <img
                    src={screenshotUrl}
                    alt="Screenshot preview"
                    className="max-h-48 w-full rounded object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !mobile.trim() || !screenshotUrl.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-pink-500/25 transition-all hover:shadow-pink-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying with AI...
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    Submit for Verification
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Result */
            <div className={`rounded-xl border p-6 backdrop-blur-md ${
              result.ok
                ? "border-green-500/30 bg-green-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}>
              {result.ok ? (
                <div className="text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                  <h2 className="mt-3 font-display text-xl font-bold text-green-400">
                    Verified!
                  </h2>
                  <p className="mt-2 text-muted-foreground">{result.message}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Admin will review and approve your reward shortly.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <XCircle className="mx-auto h-12 w-12 text-red-400" />
                  <h2 className="mt-3 font-display text-xl font-bold text-red-400">
                    Verification Failed
                  </h2>
                  <p className="mt-2 text-muted-foreground">{result.error}</p>

                  {/* Show detailed checks if available */}
                  {result.checks && (
                    <div className="mt-4 space-y-2 text-left">
                      <div className="flex items-center gap-2 text-sm">
                        {result.checks.check_instagram ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        Instagram screenshot detected
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {result.checks.check_app ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        Poppo/Vone app visible
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {result.checks.check_tag ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        @barbieverse tagged
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {result.checks.check_genuine ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        Genuine screenshot
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => { setResult(null); setScreenshotUrl(""); }}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-card/80"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
