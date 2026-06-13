import { createFileRoute } from "@tanstack/react-router";
import { JoinPage } from "./join";

export const Route = createFileRoute("/join/wobb")({
  head: () => ({
    meta: [
      { title: "Wobb x Barbieverse — Claim Your ₹500 Poppo Bonus" },
      {
        name: "description",
        content:
          "You found us on Wobb! Claim your exclusive ₹500 Poppo Live joining bonus. Sign up in 60 seconds.",
      },
      { property: "og:title", content: "Wobb x Barbieverse — Claim ₹500 Poppo Bonus" },
    ],
  }),
  component: () => (
    <JoinPage
      source="wobb"
      headline="You found us on Wobb! Claim your ₹500 Poppo joining bonus"
      sub="Exclusive offer for Wobb creators — India's fastest growing live streaming app"
    />
  ),
});
