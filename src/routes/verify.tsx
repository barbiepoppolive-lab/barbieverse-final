// src/routes/verify.tsx
// UGC Screenshot Verification Page — Currently disabled

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { AlertCircle, ArrowLeft } from "lucide-react";

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
  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-md">
          <AlertCircle className="mx-auto h-14 w-14 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Verification Paused</h1>
          <p className="mt-3 text-muted-foreground">
            Screenshot verification is currently paused. Please contact support on WhatsApp for assistance with your ₹500 reward claim.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card/60 px-5 text-sm font-semibold hover:border-gold/60"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
