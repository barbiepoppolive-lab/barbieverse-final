// /go — the clean install link we text to leads.
// ---------------------------------------------------------------------------
// Why this exists: the raw referral URL contains the app name AND lands on a
// page whose own metadata reads like an adult site — which destroys the
// scam-objection answer at the exact moment she's deciding. So we never text
// the raw link. We text barbieverse.org/go, which carries clean, safe
// metadata (og: tags, no app name) and forwards her to the real referral.
//
// The referral target itself is NOT hardcoded here — set WA_REFERRAL_URL in
// env (her actual invite link). Fallback is the generic Vone URL.

import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

const REFERRAL_URL = process.env.WA_REFERRAL_URL || "https://vone.live/";

export const Route = createFileRoute("/go")({
  head: () => ({
    meta: [
      { title: "BarbieVerse — Start Live Streaming Today" },
      {
        name: "description",
        content:
          "Join BarbieVerse and start live streaming from home for free. Free setup, free training, withdraw to your own bank. Agncy ID 2517496.",
      },
      { property: "og:title", content: "BarbieVerse — Start Live Streaming Today" },
      {
        property: "og:description",
        content:
          "Join BarbieVerse and start live streaming from home for free. Free setup, free training, withdraw to your own bank.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: GoPage,
});

function GoPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Meta-refresh fallback in case JS is slow: gone in <1s either way.
    window.location.replace(REFERRAL_URL);
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "Inter, Arial, sans-serif",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎀</div>
        <h1 style={{ color: "#ff3b8b", margin: "0 0 8px 0", fontSize: 24 }}>
          BarbieVerse
        </h1>
        <p style={{ color: "#d0d0d0", margin: 0 }}>
          Opening the page now — one second…
        </p>
        <noscript>
          <p style={{ marginTop: 16 }}>
            <a href={REFERRAL_URL} style={{ color: "#ff3b8b" }}>
              Continue to BarbieVerse →
            </a>
          </p>
        </noscript>
      </div>
    </div>
  );
}