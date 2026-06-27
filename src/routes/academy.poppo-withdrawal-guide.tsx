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
const CANONICAL_URL = `${BASE_URL}/academy/poppo-withdrawal-guide`;

const FAQ_DATA = [
  { q: "What are the 5 requirements to withdraw?", a: "1) Verified account (face authentication done), 2) Minimum 100,000 points ($10), 3) Pcoins + Points combined, 4) Withdrawal submitted before Sunday deadline, 5) Payment method configured." },
  { q: "How does the $10 formula work?", a: "Your withdrawal amount = (Pcoins + Points) ÷ 10,000. Example: 30,000 Pcoins + 70,000 Points = 100,000 ÷ 10,000 = $10." },
  { q: "What is the Sunday deadline?", a: "Submit your withdrawal request before Sunday 23:59 UTC+8 = Monday 1:29 AM IST. Miss it and your request moves to the next week's cycle." },
  { q: "What is the fastest withdrawal method for India?", a: "Epay is the fastest — 1–3 business days. USDT (crypto) is also 1–3 days but requires a crypto wallet." },
  { q: "Is there a daily withdrawal limit?", a: "No daily limit, but there is a weekly cycle. You can only submit once per week (before the Sunday deadline)." },
  { q: "What happens to leftover points below the minimum?", a: "They carry forward to the next week. Nothing is lost — you just need to reach 100,000 total before withdrawing again." },
];

const TOC = [
  { id: "surprise", label: "The Surprise" },
  { id: "requirements", label: "5 Requirements" },
  { id: "pcoins-formula", label: "Pcoins + Points Formula" },
  { id: "sunday-system", label: "Sunday System" },
  { id: "step-by-step", label: "Step-by-Step" },
  { id: "payment-methods", label: "Payment Methods" },
  { id: "withdrawal-math", label: "Withdrawal Math" },
  { id: "failure-reasons", label: "7 Failure Reasons" },
  { id: "fastest-route", label: "Fastest Route" },
  { id: "barbieverse-withdrawal", label: "BarbieVerse Support" },
  { id: "mistakes", label: "5 Mistakes" },
  { id: "faq-section", label: "FAQ" },
];

export const Route = createFileRoute("/academy/poppo-withdrawal-guide")({
  head: () => ({
    meta: [
      { title: "How to Withdraw Money from Poppo Live / Vone — Complete India Guide (2025) | Barbieverse" },
      { name: "description", content: "Everything Indian hosts need to know about withdrawing from Poppo / Vone — exact steps, the Sunday deadline in IST, every payment method with fees, the Pcoins + Points formula, and why most first withdrawals fail." },
      { name: "keywords", content: "poppo live withdrawal india, vone live paise kaise nikale, poppo live withdrawal kaise kare" },
      { property: "og:title", content: "How to Withdraw Money from Poppo Live / Vone — Complete India Guide (2025)" },
      { property: "og:description", content: "Everything Indian hosts need to know about withdrawing from Poppo / Vone — exact steps, the Sunday deadline in IST, every payment method." },
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
          headline: "How to Withdraw Money from Poppo Live / Vone — Complete India Guide (2025)",
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
            { "@type": "ListItem", position: 3, name: "Poppo Withdrawal Guide", item: CANONICAL_URL },
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
  component: PoppoWithdrawalGuide,
});

function PoppoWithdrawalGuide() {
  return (
    <SiteLayout>
      <LessonHero
        lessonNumber={8}
        title="How to Withdraw Money from Poppo / Vone"
        subtitle="The Sunday System, Payment Methods, and Why First Withdrawals Fail"
        readTime="14 min read"
        difficulty="Beginner Friendly"
      />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <LessonTOC items={TOC} />

          {/* Surprise */}
          <section id="surprise" className="mb-16 scroll-mt-20">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 backdrop-blur-md sm:p-8">
              <p className="font-display text-lg font-medium italic text-foreground sm:text-xl">
                "You earned 100,000 points. You go to withdraw. It fails. You try again. It fails again. The reason is almost always the same — and completely avoidable."
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Most first withdrawals fail because hosts don't understand the Sunday deadline, the Pcoins + Points formula, or the 5 requirements. This guide covers every detail.
              </p>
            </div>
          </section>

          {/* Requirements */}
          <section id="requirements" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">5 Requirements</span> to Withdraw
            </h2>
            <LessonTable
              columns={[
                { header: "Requirement", key: "req" },
                { header: "Details", key: "details" },
                { header: "Status Check", key: "status" },
              ]}
              rows={[
                { req: "Verified Account", details: "Face authentication completed and approved", status: "Profile → Verified badge" },
                { req: "Minimum Points", details: "100,000 combined (Pcoins + Points) = $10", status: "Wallet → Total balance" },
                { req: "Payment Method", details: "Epay, USDT, PayPal, or bank configured", status: "Settings → Payment" },
                { req: "Sunday Deadline", details: "Submit before Sunday 23:59 UTC+8", status: "Monday 1:29 AM IST cutoff" },
                { req: "No Active Violation", details: "Account not flagged or restricted", status: "Check notifications" },
              ]}
            />
            <LessonCallout variant="warning" label="First-Time Requirement">
              Your first withdrawal requires completed face authentication. This can take 30 minutes to 48 hours for approval. Complete it before you reach 100,000 points.
            </LessonCallout>
          </section>

          {/* Pcoins Formula */}
          <section id="pcoins-formula" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Pcoins + Points</span> Formula
            </h2>
            <LessonCallout variant="info" label="The Formula">
              <strong>(Pcoins + Points) ÷ 10,000 = Withdrawal Amount in USD</strong><br />
              Example: 30,000 Pcoins + 70,000 Points = 100,000 ÷ 10,000 = $10
            </LessonCallout>
            <LessonTable
              columns={[
                { header: "Pcoins", key: "pcoins" },
                { header: "Points", key: "points" },
                { header: "Total", key: "total" },
                { header: "Withdrawal $", key: "usd" },
                { header: "Withdrawal ₹", key: "inr" },
              ]}
              rows={[
                { pcoins: "0", points: "100,000", total: "100,000", usd: "$10", inr: "₹830" },
                { pcoins: "30,000", points: "70,000", total: "100,000", usd: "$10", inr: "₹830" },
                { pcoins: "50,000", points: "150,000", total: "200,000", usd: "$20", inr: "₹1,660" },
                { pcoins: "100,000", points: "400,000", total: "500,000", usd: "$50", inr: "₹4,150" },
                { pcoins: "0", points: "1,000,000", total: "1,000,000", usd: "$100", inr: "₹8,300" },
              ]}
            />
          </section>

          {/* Sunday System */}
          <section id="sunday-system" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Sunday System</span>
            </h2>
            <LessonCallout variant="danger" label="The Deadline">
              Submit your withdrawal request before <strong>Sunday 23:59 UTC+8</strong> = <strong>Monday 1:29 AM IST</strong>. Miss it by even one minute — your request moves to the next week's cycle.
            </LessonCallout>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                <strong className="text-foreground">Weekly cycle:</strong> You can only submit one withdrawal request per week. The processing window opens after each Sunday deadline.
              </p>
              <p>
                <strong className="text-foreground">Processing times:</strong> After submission, funds arrive in 1–7 business days depending on your payment method.
              </p>
            </div>
          </section>

          {/* Step by Step */}
          <section id="step-by-step" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Step-by-Step</span> Withdrawal
            </h2>
            <LessonImage
              src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&auto=format&fit=crop"
              alt="Digital payment interface representing withdrawal to bank account"
              caption="Withdraw your earnings to UPI, Paytm, or bank transfer"
            />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <ol className="list-decimal space-y-3 pl-5">
                <li><strong className="text-foreground">Open Vone/Poppo → Profile → Wallet</strong></li>
                <li><strong className="text-foreground">Check your total balance</strong> — Pcoins + Points must equal 100,000+ for first withdrawal</li>
                <li><strong className="text-foreground">Tap "Withdraw"</strong> — select amount (must be $10 or multiple)</li>
                <li><strong className="text-foreground">Select payment method</strong> — Epay, USDT, PayPal, or bank</li>
                <li><strong className="text-foreground">Enter payment details</strong> — account number, email, or wallet address</li>
                <li><strong className="text-foreground">Confirm withdrawal</strong> — review all details before submitting</li>
                <li><strong className="text-foreground">Wait for processing</strong> — 1–7 business days depending on method</li>
              </ol>
            </div>
            <LessonCallout variant="tip" label="Pro Tip">
              Complete your face authentication and payment method setup BEFORE reaching 100,000 points. This avoids delays when you're ready to withdraw.
            </LessonCallout>
          </section>

          {/* Payment Methods */}
          <section id="payment-methods" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Payment Methods</span> for India
            </h2>
            <LessonTable
              columns={[
                { header: "Method", key: "method" },
                { header: "Processing Time", key: "time" },
                { header: "Fees", key: "fees" },
                { header: "Best For", key: "best" },
              ]}
              rows={[
                { method: "Epay", time: "1–3 days", fees: "Low", best: "Recommended for India — fastest" },
                { method: "USDT (crypto)", time: "1–3 days", fees: "Network fees", best: "If you have crypto wallet" },
                { method: "PayPal", time: "3–5 days", fees: "Standard PayPal fees", best: "International payments" },
                { method: "Bank Transfer", time: "3–7 days", fees: "Bank charges apply", best: "Direct to Indian bank account" },
              ]}
            />
            <LessonCallout variant="info" label="Epay for India">
              Epay is the fastest and most reliable method for Indian hosts. Setup takes 5 minutes and supports direct INR conversion.
            </LessonCallout>
          </section>

          {/* Withdrawal Math */}
          <section id="withdrawal-math" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Withdrawal</span> Math
            </h2>
            <LessonTable
              columns={[
                { header: "Scenario", key: "scenario" },
                { header: "Points", key: "points" },
                { header: "USD", key: "usd" },
                { header: "₹ (approx)", key: "inr" },
              ]}
              rows={[
                { scenario: "Minimum withdrawal", points: "100,000", usd: "$10", inr: "₹830" },
                { scenario: "Month 1 (tasks only)", points: "300,000", usd: "$30", inr: "₹2,490" },
                { scenario: "Month 2 (tasks + gifts)", points: "500,000", usd: "$50", inr: "₹4,150" },
                { scenario: "Month 3 (active host)", points: "1,000,000", usd: "$100", inr: "₹8,300" },
                { scenario: "Top host (6+ months)", points: "5,000,000+", usd: "$500+", inr: "₹41,500+" },
              ]}
            />
          </section>

          {/* Failure Reasons */}
          <section id="failure-reasons" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">7 Failure Reasons</span> and Fixes
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { reason: "Face authentication not completed", fix: "Complete face scan in Profile → Verification. Approval takes 30 min to 48 hours." },
                { reason: "Below 100,000 points minimum", fix: "Wait until Pcoins + Points = 100,000+. Nothing is lost — they carry forward." },
                { reason: "Missed Sunday deadline", fix: "Set a recurring alarm for Sunday 11 PM IST. Submit before Monday 1:29 AM IST." },
                { reason: "Payment method not configured", fix: "Go to Settings → Payment → add your Epay/PayPal/bank details before withdrawing." },
                { reason: "Wrong payment details entered", fix: "Double-check account number, email, or wallet address. Wrong details = funds lost." },
                { reason: "Account flagged for violation", fix: "Check notifications for any violations. Contact BarbieVerse support for resolution." },
                { reason: "Trying to withdraw partial amount", fix: "Withdrawals must be in $10 multiples. 95,000 points = cannot withdraw. Wait for 100,000." },
              ].map((f, i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card/30 p-4 backdrop-blur-md">
                  <p className="text-sm font-semibold text-destructive">❌ {f.reason}</p>
                  <p className="mt-1 text-sm text-primary">✅ {f.fix}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Fastest Route */}
          <section id="fastest-route" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Fastest Route</span> to Withdrawal
            </h2>
            <div className="mt-8 rounded-2xl border border-border/40 bg-card/30 p-6 backdrop-blur-md">
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">1</span>
                  <span><strong className="text-foreground">Day 1:</strong> Complete face authentication + set up Epay</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">2</span>
                  <span><strong className="text-foreground">Week 1:</strong> Stream daily for 20,000 pts/day (female) = 140,000 pts</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">3</span>
                  <span><strong className="text-foreground">Week 2:</strong> Submit withdrawal before Sunday deadline = $10 in 1–3 days</span>
                </div>
              </div>
            </div>
          </section>

          {/* BarbieVerse Withdrawal */}
          <section id="barbieverse-withdrawal" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">BarbieVerse</span> Withdrawal Support
            </h2>
            <LessonTable
              columns={[
                { header: "Service", key: "service" },
                { header: "What You Get", key: "what" },
              ]}
              rows={[
                { service: "Deadline reminders", what: "WhatsApp alerts before every Sunday cutoff" },
                { service: "Payment setup help", what: "Step-by-step Epay/PayPal configuration" },
                { service: "Failure troubleshooting", what: "Hindi + English support for withdrawal issues" },
                { service: "Document guidance", what: "Help with verification documents" },
              ]}
            />
          </section>

          {/* Mistakes */}
          <section id="mistakes" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">5 Mistakes</span> That Delay Your Money
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { myth: "Not setting up payment method early", fix: "Configure Epay/PayPal in Week 1. Don't wait until you have 100,000 points." },
                { myth: "Missing the Sunday deadline", fix: "Set a recurring alarm for Sunday 11 PM IST. The deadline is Monday 1:29 AM IST." },
                { myth: "Entering wrong payment details", fix: "Triple-check account number, email, or wallet address. Wrong details = funds lost permanently." },
                { myth: "Withdrawing below $10", fix: "100,000 points minimum. 99,999 = cannot withdraw. Wait one more day." },
                { myth: "Not completing face authentication", fix: "First withdrawal requires verified identity. Complete it in Week 1, not Week 3." },
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
            prev={{ slug: "/academy/pk-battle-guide", title: "PK Battles Explained" }}
            next={null}
          />

          <div className="mt-8">
            <LessonCTA />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
