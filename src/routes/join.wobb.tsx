import { createFileRoute } from "@tanstack/react-router";
import { JoinPage } from "./join";

export const Route = createFileRoute("/join/wobb")({
  head: () => ({
    meta: [
      { title: "Wobb x Barbieverse — Earn ₹1,150+ Poppo Bonus | Barbieverse" },
      {
        name: "description",
        content:
          "You found us on Wobb! Claim your exclusive ₹1,150+ Poppo Live joining bonus. Sign up in 60 seconds.",
      },
      { property: "og:title", content: "Wobb x Barbieverse — Earn ₹1,150+ Poppo Bonus" },
      {
        property: "og:description",
        content: "You found us on Wobb! Claim your ₹1,150+ Poppo joining bonus.",
      },
    ],
  }),
  component: () => (
    <JoinPage
      source="wobb"
      badge="Welcome from Wobb 🎉"
      headline="You Found Us on Wobb — Start Earning ₹1,150+ This Week"
      sub="India's top Poppo creator agency. Join via Wobb and get priority onboarding."
      successMsg="Application received! Our team will WhatsApp you within 2 hours."
    />
  ),
});
