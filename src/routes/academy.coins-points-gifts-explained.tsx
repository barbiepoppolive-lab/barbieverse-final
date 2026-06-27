import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { LessonHero } from "@/components/academy/LessonHero";
import { LessonTOC } from "@/components/academy/LessonTOC";
import { LessonCallout } from "@/components/academy/LessonCallout";
import { LessonTable } from "@/components/academy/LessonTable";
import { LessonNav } from "@/components/academy/LessonNav";
import { LessonCTA } from "@/components/academy/LessonCTA";
import { LessonImage } from "@/components/academy/LessonImage";
import { LessonFAQ } from "@/components/academy/LessonFAQ";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://barbieverse.org";
const CANONICAL_URL = `${BASE_URL}/academy/coins-points-gifts-explained`;

const FAQ_DATA = [
  { q: "What are coins on Poppo Live?", a: "Coins are what viewers buy with real money and spend on gifts. Hosts never buy coins — they earn points instead." },
  { q: "What are points on Poppo Live?", a: "Points are what hosts earn when viewers send them gifts. Points sit in the host wallet and are withdrawn as real money." },
  { q: "How much does a host keep from each gift?", a: "Hosts keep 70% of every gift's coin value as points. For live streams and party rooms. 1v1 private matches pay 40%." },
  { q: "What is the fixed conversion rate?", a: "10,000 Points = $1 USD ≈ ₹83. This rate is fixed and never changes." },
  { q: "What is the minimum withdrawal?", a: "100,000 points = $10 USD ≈ ₹830. You cannot withdraw below this amount." },
  { q: "What are Pcoins?", a: "Pcoins are earned from platform tasks, daily missions, and bonuses. They form 30% of every withdrawal alongside Points (70%)." },
  { q: "Where can I buy coins cheapest in India?", a: "BarbieVerse authorized reseller offers 15-20% cheaper coins than in-app Google Play purchases. UPI/Paytm/Google Pay accepted." },
  { q: "When is the withdrawal deadline?", a: "Submit before Sunday 23:59 UTC+8 = Monday 1:29 AM IST. Miss it and your request moves to the next week." },
];

const TOC = [
  { id: "question", label: "The Key Question" },
  { id: "coins", label: "What Are Coins?" },
  { id: "gifts", label: "What Are Gifts?" },
  { id: "points", label: "What Are Points?" },
  { id: "money-flow", label: "Full Money Flow" },
  { id: "formulas", label: "3 Formulas Every Host Must Know" },
  { id: "pcoins", label: "What Are Pcoins?" },
  { id: "withdrawal", label: "Withdrawal Process" },
  { id: "coins-vs-points", label: "Coins vs Points" },
  { id: "recharge-india", label: "Where to Buy Coins in India" },
  { id: "mistakes", label: "4 Costly Mistakes" },
  { id: "faq-section", label: "FAQ" },
];

export const Route = createFileRoute("/academy/coins-points-gifts-explained")({
  head: () => ({
    meta: [
      { title: "Poppo Live Coins vs Points vs Gifts Explained — Complete India Guide (2025) | Barbieverse" },
      { name: "description", content: "Confused by coins vs points on Poppo/Vone? This lesson explains the exact conversion, what every gift is worth in ₹, the 70% rule, Pcoins, and how Indian hosts withdraw." },
      { name: "keywords", content: "poppo live coins vs points, poppo live coins kya hai, vone live coins india, poppo gifts explained" },
      { property: "og:title", content: "Poppo Live Coins vs Points vs Gifts Explained — Complete India Guide (2025)" },
      { property: "og:description", content: "The exact conversion from coins to points to rupees. Real numbers, no guesswork." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow" },
      { rel: "canonical", href: CANONICAL_URL },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Poppo Live Coins vs Points vs Gifts Explained — Complete India Guide (2025)",
          author: { "@type": "Organization", name: "BarbieVerse Academy", url: BASE_URL },
          publisher: { "@type": "Organization", name: "BarbieVerse", url: BASE_URL },
          datePublished: "2025-01-01",
          dateModified: "2025-06-27",
          mainEntityOfPage: CANONICAL_URL,
          inLanguage: "en-IN",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
            { "@type": "ListItem", position: 2, name: "Academy", item: `${BASE_URL}/academy` },
            { "@type": "ListItem", position: 3, name: "Coins, Points & Gifts", item: CANONICAL_URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_DATA.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: CoinsPointsGifts,
});

function CoinsPointsGifts() {
  return (
    <SiteLayout>
      <LessonHero
        lessonNumber={2}
        title="Coins, Points & Gifts"
        subtitle="How the Poppo Money System Really Works"
        readTime="10 min read"
        difficulty="Beginner Friendly"
      />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <LessonTOC items={TOC} />

          {/* Key Question */}
          <section id="question" className="mb-16 scroll-mt-20">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 backdrop-blur-md sm:p-8">
              <p className="font-display text-lg font-medium italic text-foreground sm:text-xl">
                "A viewer spends ₹830 on coins and gifts them all to you. How much do you actually receive?"
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                The answer is not ₹830. Understanding exactly why — and how much it really is — is the most important thing any host needs to know.
              </p>
            </div>
          </section>

          {/* Coins */}
          <section id="coins" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">What Are Coins?</span> (Viewer Currency)
            </h2>
            <LessonImage
              src="https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200&auto=format&fit=crop"
              alt="Stack of gold coins representing virtual currency"
              caption="Coins are the virtual currency viewers use to purchase gifts for hosts"
            />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Coins are what <strong className="text-foreground">viewers buy</strong> with real money and spend on gifts. Hosts never buy coins — they earn points instead.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Region", key: "region" },
                { header: "Coins per $1 USD", key: "coins" },
                { header: "Notes", key: "notes" },
              ]}
              rows={[
                { region: "Global average", coins: "9,460 coins", notes: "Standard rate" },
                { region: "India (in-app)", coins: "~8,300–9,100 coins", notes: "Via Google Play, higher price" },
                { region: "India (reseller)", coins: "~9,400–9,460 coins", notes: "Via authorized resellers like BarbieVerse" },
                { region: "Philippines", coins: "12,000+ coins", notes: "Subsidised local pricing" },
                { region: "Nepal", coins: "8,900 coins", notes: "—" },
              ]}
            />
            <LessonCallout variant="tip" label="India Insight">
              Buying coins inside the Vone app via Google Play costs more because Google adds its own platform fee. Buying from an authorized reseller like BarbieVerse gives you closer to the global rate — saving 15–20% on every recharge.
            </LessonCallout>
            <div className="mt-4 rounded-xl border border-border/40 bg-card/30 p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Coin rules:</strong><br />
              • Coins are non-transferable between accounts<br />
              • Coins expire after 12 months if unused<br />
              • Coins bought via reseller are credited via your User ID only — no password needed
            </div>
          </section>

          {/* Gifts */}
          <section id="gifts" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">What Are Gifts?</span>
            </h2>
            <LessonImage
              src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1200&auto=format&fit=crop"
              alt="Heart-shaped gift box representing virtual gifts on live streaming"
              caption="Virtual gifts range from simple hearts to luxury items worth thousands of coins"
            />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Gifts are what viewers send during your stream using their coins. When a gift is sent, it <strong className="text-foreground">animates on screen with the viewer's name</strong> — everyone in the room sees it.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Gift", key: "gift" },
                { header: "Coin Cost", key: "coins" },
                { header: "Viewer Spends (₹)", key: "spends" },
                { header: "Host Receives (Points)", key: "points" },
                { header: "Host Earns (₹)", key: "earns" },
              ]}
              rows={[
                { gift: "🌹 Rose", coins: "200", spends: "₹17", points: "140", earns: "₹1.16" },
                { gift: "🏆 Trophy", coins: "500", spends: "₹42", points: "350", earns: "₹2.90" },
                { gift: "🚗 Luxury Car", coins: "10,000", spends: "₹830", points: "7,000", earns: "₹58" },
                { gift: "🛥️ Yacht", coins: "1,000", spends: "₹83", points: "700", earns: "₹5.80" },
                { gift: "✈️ Private Jet", coins: "50,000", spends: "₹4,150", points: "35,000", earns: "₹290" },
              ]}
            />
          </section>

          {/* Points */}
          <section id="points" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">What Are Points?</span> (Host Currency)
            </h2>
            <LessonImage
              src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&auto=format&fit=crop"
              alt="Calculator and financial charts representing host earnings"
              caption="Points convert to real money — 100 points = ₹1 when you withdraw"
            />
            <LessonCallout variant="tip" label="The Fixed Rule — Never Changes">
              <strong>10,000 Points = $1 USD ≈ ₹83</strong><br />
              Host keeps 70% of every gift as points. For 1v1 matches, retention is 40% but at 1,400–4,200 points per minute.
            </LessonCallout>
          </section>

          {/* Money Flow */}
          <section id="money-flow" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Full Money Flow</span> — Exactly
            </h2>
            <div className="mt-8 rounded-2xl border border-border/40 bg-card/30 p-6 backdrop-blur-md">
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">1</span>
                  <span><strong className="text-foreground">Viewer</strong> pays ₹830 → gets 10,000 coins</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">2</span>
                  <span><strong className="text-foreground">Viewer</strong> sends 10,000-coin gift during stream</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">3</span>
                  <span><strong className="text-foreground">Host</strong> receives 7,000 points (70% of 10,000)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">4</span>
                  <span><strong className="text-foreground">Host</strong> withdraws as ₹58.10 in wallet</span>
                </div>
              </div>
              <div className="mt-4 border-t border-border/40 pt-4 text-xs text-muted-foreground">
                <strong className="text-foreground">In plain numbers:</strong> Viewer spends ₹830 · Host receives ₹580 (70%) · Poppo keeps ₹250 (30%)
              </div>
            </div>
          </section>

          {/* Formulas */}
          <section id="formulas" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">3 Formulas</span> Every Host Must Know
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { label: "Coins gifted → Points earned", formula: "Coins × 0.70 = Points" },
                { label: "Points → Rupees", formula: "Points ÷ 10,000 × 83 = ₹" },
                { label: "Full calculation", formula: "(Coins × 0.70) ÷ 10,000 × 83 = ₹ earned" },
              ].map((f, i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card/30 p-4 backdrop-blur-md">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-primary">{f.formula}</p>
                </div>
              ))}
            </div>
            <LessonTable
              columns={[
                { header: "Viewer Sends (coins)", key: "coins" },
                { header: "Host Earns (points)", key: "points" },
                { header: "Host Earns (₹)", key: "rupees" },
              ]}
              rows={[
                { coins: "200 (Rose)", points: "140", rupees: "₹1.16" },
                { coins: "1,000 (Yacht)", points: "700", rupees: "₹5.80" },
                { coins: "10,000", points: "7,000", rupees: "₹58" },
                { coins: "1,00,000", points: "70,000", rupees: "₹580" },
                { coins: "10,00,000", points: "7,00,000", rupees: "₹5,800" },
              ]}
            />
          </section>

          {/* Pcoins */}
          <section id="pcoins" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">What Are Pcoins?</span>
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Some hosts notice two entries in their wallet — <strong className="text-foreground">Points</strong> and <strong className="text-foreground">Pcoins</strong>.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li><strong className="text-foreground">Points</strong> = earned from viewer gifts (70% of gift coin value). Withdrawable.</li>
                <li><strong className="text-foreground">Pcoins</strong> = earned from platform tasks, bonuses, daily missions. Also withdrawable.</li>
              </ul>
              <p>
                When you withdraw $10, Poppo combines both sources automatically. You do not manage them separately.
              </p>
            </div>
          </section>

          {/* Withdrawal */}
          <section id="withdrawal" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Withdrawal</span> — The Exact Process
            </h2>
            <LessonCallout variant="warning" label="Sunday Deadline">
              Submit your withdrawal request before <strong>Sunday 23:59 UTC+8</strong> = <strong>Monday 1:29 AM IST</strong>. Miss it by even one minute — your request goes into the next week's cycle.
            </LessonCallout>
            <LessonTable
              columns={[
                { header: "Method", key: "method" },
                { header: "Processing Time", key: "time" },
                { header: "Notes", key: "notes" },
              ]}
              rows={[
                { method: "Epay", time: "1–3 days", notes: "Fastest — recommended for India" },
                { method: "USDT (crypto)", time: "1–3 days", notes: "Requires crypto wallet" },
                { method: "PayPal", time: "3–5 days", notes: "Available but slower" },
                { method: "Bank transfer", time: "3–7 days", notes: "Slowest option" },
              ]}
            />
          </section>

          {/* Coins vs Points */}
          <section id="coins-vs-points" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Coins vs Points</span> — The Table That Resolves All Confusion
            </h2>
            <LessonTable
              columns={[
                { header: "Feature", key: "feature" },
                { header: "Coins 🪙", key: "coins" },
                { header: "Points ⭐", key: "points" },
              ]}
              rows={[
                { feature: "Who has them", coins: "Viewers", points: "Hosts" },
                { feature: "How you get them", coins: "Buy with ₹", points: "Earned from gifts + tasks" },
                { feature: "Can you withdraw?", coins: "❌ No", points: "✅ Yes" },
                { feature: "Expiry", coins: "12 months if unused", points: "No expiry" },
                { feature: "Rate", coins: "~9,460 coins = $1", points: "10,000 points = $1" },
                { feature: "Used for", coins: "Sending gifts", points: "Withdrawing as cash" },
              ]}
            />
          </section>

          {/* Recharge India */}
          <section id="recharge-india" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Where to Buy Coins</span> in India
            </h2>
            <LessonTable
              columns={[
                { header: "Method", key: "method" },
                { header: "Price", key: "price" },
                { header: "Payment", key: "payment" },
                { header: "Time", key: "time" },
              ]}
              rows={[
                { method: "In-app (Google Play)", price: "Full price + Google fee", payment: "Card, UPI via Play", time: "Instant" },
                { method: "BarbieVerse (reseller)", price: "15–20% cheaper", payment: "UPI, Paytm, Google Pay", time: "Instant" },
              ]}
            />
            <LessonCallout variant="tip" label="How to Recharge via BarbieVerse">
              1. Open Vone → Profile → your User ID (8-10 digit number below profile picture)<br />
              2. Copy it — do not type from memory (wrong ID = coins go to stranger, non-refundable)<br />
              3. Go to barbieverse.org/recharge<br />
              4. Choose package, enter User ID, pay via UPI<br />
              5. Coins credited within minutes
            </LessonCallout>
          </section>

          {/* Mistakes */}
          <section id="mistakes" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">4 Costly Mistakes</span>
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { myth: "Thinking coins = points", fix: "They are different currencies. Viewers have coins. Hosts earn points. Never interchangeable." },
                { myth: "Forgetting the 70% rule", fix: "A viewer sending 1,000-coin gift = you earn 700 points = ₹5.80. Not ₹83." },
                { myth: "Trying to withdraw below the minimum", fix: "90,000 points = cannot withdraw. Minimum is 100,000. They carry forward — nothing is lost." },
                { myth: "Missing the Sunday deadline", fix: "In India this is Monday 1:29 AM IST. Miss it = wait another full week." },
              ].map((m, i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card/30 p-4 backdrop-blur-md">
                  <p className="text-sm font-semibold text-destructive">❌ {m.myth}</p>
                  <p className="mt-1 text-sm text-primary">✅ {m.fix}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section id="faq-section" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">Frequently Asked Questions</h2>
            <div className="mt-6">
              <LessonFAQ items={FAQ_DATA} />
            </div>
          </section>

          <LessonNav
            prev={{ slug: "/academy/what-is-poppo-live", title: "What Is Poppo Live?" }}
            next={{ slug: "/academy/vone-app-india", title: "Vone App India Guide" }}
          />

          <div className="mt-8">
            <LessonCTA />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
