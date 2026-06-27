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
const CANONICAL_URL = `${BASE_URL}/academy/poppo-live-earning-india`;

const FAQ_DATA = [
  { q: "What is the conversion rate from points to rupees?", a: "10,000 points = $1 USD ≈ ₹83. This rate is fixed and never changes." },
  { q: "How much can I earn in Week 1?", a: "Female hosts: ₹1,162 (20,000 pts/day × 7 days). Male hosts: ₹581 (10,000 pts/day × 7 days). Streaming 2 hours/day." },
  { q: "What is the typical Month 1 earning range?", a: "₹1,162 to ₹2,490 for most new hosts. The range depends on consistency, category, and viewer engagement." },
  { q: "Does joining an agency reduce my income by 70%?", a: "No. Agency commission is 4%–20% of your earnings, not 70%. The 70% figure refers to gift retention — what you keep from each gift." },
  { q: "What is the first real milestone?", a: "Reaching 100,000 points ($10) enables your first withdrawal. Most hosts reach this in Week 2–3." },
  { q: "How much do 1v1 private matches pay?", a: "1v1 matches pay 40% retention but at 1,400–4,200 points per minute, making them potentially higher-earning than regular streams for skilled hosts." },
];

const TOC = [
  { id: "three-numbers", label: "3 Controlling Numbers" },
  { id: "week-1", label: "Week 1 Earning Numbers" },
  { id: "growth", label: "Month-by-Month Growth" },
  { id: "variables", label: "Points Per Hour by Experience" },
  { id: "salary-tiers", label: "Salary Tier System" },
  { id: "activities", label: "Activities Comparison" },
  { id: "solo-vs-agency", label: "Solo vs Agency" },
  { id: "india-context", label: "India Context" },
  { id: "myths", label: "3 Myths Corrected" },
  { id: "faq-section", label: "FAQ" },
];

export const Route = createFileRoute("/academy/poppo-live-earning-india")({
  head: () => ({
    meta: [
      { title: "How Much Can You Earn on Poppo Live / Vone in India? Honest Numbers (2025) | Barbieverse" },
      { name: "description", content: "Real earning numbers for Indian Vone / Poppo hosts — Week 1 to Month 6. Task income, gift income, salary tiers, agency vs solo, and exactly what top hosts earn in ₹." },
      { name: "keywords", content: "poppo live earning india, vone live se kitna paise milta hai, poppo live salary india" },
      { property: "og:title", content: "How Much Can You Earn on Poppo Live / Vone in India? Honest Numbers (2025)" },
      { property: "og:description", content: "Real earning numbers for Indian Vone / Poppo hosts — Week 1 to Month 6. Task income, gift income, salary tiers, agency vs solo." },
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
          headline: "How Much Can You Earn on Poppo Live / Vone in India? Honest Numbers (2025)",
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
            { "@type": "ListItem", position: 3, name: "Poppo Live Earning India", item: CANONICAL_URL },
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
  component: PoppoLiveEarningIndia,
});

function PoppoLiveEarningIndia() {
  return (
    <SiteLayout>
      <LessonHero
        lessonNumber={5}
        title="How Much Can You Really Earn on Vone / Poppo?"
        subtitle="Honest India Numbers — Week 1 to Month 6"
        readTime="11 min read"
        difficulty="Beginner Friendly"
      />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <LessonTOC items={TOC} />

          {/* 3 Controlling Numbers */}
          <section id="three-numbers" className="mb-16 scroll-mt-20">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 backdrop-blur-md sm:p-8">
              <p className="font-display text-lg font-medium italic text-foreground sm:text-xl">
                "Every earning number on Poppo / Vone is controlled by exactly 3 numbers. Understand these and you can calculate any scenario."
              </p>
              <div className="mt-6 space-y-3">
                {[
                  { num: "10,000", desc: "Points = $1 USD ≈ ₹83. Fixed rate. Never changes." },
                  { num: "70%", desc: "Gift retention for live streams and party rooms. You keep 70% of every gift's coin value as points." },
                  { num: "40%", desc: "Gift retention for 1v1 private matches. Lower percentage but higher point volume per minute." },
                ].map((n, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">{i + 1}</span>
                    <div>
                      <p className="font-mono text-sm font-bold text-primary">{n.num}</p>
                      <p className="text-sm text-muted-foreground">{n.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Week 1 */}
          <section id="week-1" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Week 1</span> Earning Numbers
            </h2>
            <LessonImage
              src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&auto=format&fit=crop"
              alt="Plant growing from coins representing earnings and growth"
              caption="Start earning from day one — complete tasks and receive viewer gifts"
            />
            <p className="mt-2 text-sm text-muted-foreground">Streaming 2 hours per day for 7 consecutive days:</p>
            <LessonTable
              columns={[
                { header: "Host Gender", key: "gender" },
                { header: "Daily Task Points", key: "daily" },
                { header: "Daily ₹", key: "dailyRs" },
                { header: "7-Day Total ₹", key: "total" },
              ]}
              rows={[
                { gender: "Female", daily: "20,000 pts", dailyRs: "₹166", total: "₹1,162" },
                { gender: "Male", daily: "10,000 pts", dailyRs: "₹83", total: "₹581" },
              ]}
            />
            <LessonCallout variant="warning">
              Miss even one day of the 7-day streak and it <strong>resets to Day 1</strong>. The streak does not pause or carry forward.
            </LessonCallout>
          </section>

          {/* Growth */}
          <section id="growth" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Month-by-Month</span> Growth
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Typical host growth trajectory with consistent streaming:</p>
            <LessonTable
              columns={[
                { header: "Month", key: "month" },
                { header: "Task Income ₹", key: "task" },
                { header: "Gift Income ₹", key: "gift" },
                { header: "Total ₹", key: "total" },
              ]}
              rows={[
                { month: "Month 1", task: "₹1,162–2,490", gift: "₹0–500", total: "₹1,162–2,990" },
                { month: "Month 2", task: "₹2,490–4,150", gift: "₹500–2,000", total: "₹2,990–6,150" },
                { month: "Month 3", task: "₹4,150–6,640", gift: "₹2,000–8,000", total: "₹6,150–14,640" },
                { month: "Month 4", task: "₹4,150–6,640", gift: "₹5,000–15,000", total: "₹9,150–21,640" },
                { month: "Month 5", task: "₹4,150–8,300", gift: "₹8,000–25,000", total: "₹12,150–33,300" },
                { month: "Month 6", task: "₹4,150–8,300", gift: "₹15,000–50,000+", total: "₹19,150–58,300+" },
              ]}
            />
            <LessonCallout variant="info">
              Task income plateaus around Month 3. Real growth comes from gift income, which depends on viewer loyalty and engagement.
            </LessonCallout>
          </section>

          {/* Variables */}
          <section id="variables" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Points Per Hour</span> by Experience
            </h2>
            <LessonTable
              columns={[
                { header: "Experience Level", key: "level" },
                { header: "Avg Points/Hour", key: "pph" },
                { header: "Hourly ₹", key: "hourly" },
                { header: "Monthly (4hrs/day)", key: "monthly" },
              ]}
              rows={[
                { level: "Beginner (Month 1)", pph: "2,000–5,000", hourly: "₹16–41", monthly: "₹1,960–4,900" },
                { level: "Intermediate (Month 2–3)", pph: "5,000–15,000", hourly: "₹41–124", monthly: "₹4,900–14,700" },
                { level: "Experienced (Month 4–6)", pph: "15,000–40,000", hourly: "₹124–332", monthly: "₹14,700–39,200" },
                { level: "Top Host (6+ months)", pph: "40,000–100,000+", hourly: "₹332–830+", monthly: "₹39,200–98,000+" },
              ]}
            />
          </section>

          {/* Salary Tiers */}
          <section id="salary-tiers" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Salary Tier</span> System
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Monthly salary bonuses based on streaming consistency and earnings:</p>
            <LessonTable
              columns={[
                { header: "Tier", key: "tier" },
                { header: "Monthly Requirement", key: "req" },
                { header: "Salary Bonus ₹", key: "bonus" },
                { header: "Typical Month", key: "typical" },
              ]}
              rows={[
                { tier: "D", req: "Basic streaming", bonus: "₹830", typical: "Month 1" },
                { tier: "C", req: "Consistent schedule", bonus: "₹1,660", typical: "Month 1–2" },
                { tier: "B", req: "Growing audience", bonus: "₹4,150", typical: "Month 2–3" },
                { tier: "A", req: "Strong performance", bonus: "₹8,300", typical: "Month 3–4" },
                { tier: "S", req: "Top performer", bonus: "₹16,600", typical: "Month 4–6" },
                { tier: "S-IDOL", req: "Elite host", bonus: "₹41,500+", typical: "Month 6+" },
              ]}
            />
          </section>

          {/* Activities */}
          <section id="activities" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Activities</span> Comparison
            </h2>
            <LessonTable
              columns={[
                { header: "Activity", key: "activity" },
                { header: "Points/Hour", key: "pph" },
                { header: "Difficulty", key: "difficulty" },
                { header: "Best For", key: "best" },
              ]}
              rows={[
                { activity: "Live Streaming", pph: "2,000–100,000", difficulty: "Medium", best: "Consistent daily income" },
                { activity: "PK Battles", pph: "5,000–200,000", difficulty: "High", best: "High-earning spikes" },
                { activity: "Party Rooms", pph: "3,000–50,000", difficulty: "Low", best: "Group engagement" },
                { activity: "1v1 Private Match", pph: "1,400–4,200/min", difficulty: "High", best: "Skilled hosts" },
                { activity: "Crown Seat", pph: "800/hr", difficulty: "Low", best: "Passive income" },
              ]}
            />
          </section>

          {/* Solo vs Agency */}
          <section id="solo-vs-agency" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Solo vs Agency</span> — Real Difference
            </h2>
            <LessonTable
              columns={[
                { header: "Feature", key: "feature" },
                { header: "Solo Host", key: "solo" },
                { header: "Agency Host", key: "agency" },
              ]}
              rows={[
                { feature: "Commission", solo: "0% (keep everything)", agency: "4%–20% of earnings" },
                { feature: "Week 1 tasks", solo: "May not activate", agency: "Guaranteed activation" },
                { feature: "PK opponents", solo: "Random strangers", agency: "Coordinated matches" },
                { feature: "Support", solo: "English-only official", agency: "Hindi + English WhatsApp" },
                { feature: "Event alerts", solo: "Miss most", agency: "Advance notice" },
                { feature: "Coin recharge", solo: "Full in-app price", agency: "15–20% cheaper" },
                { feature: "Net income (Month 3)", solo: "₹6,150–14,640", agency: "₹5,700–13,900 (after 4–20%)" },
              ]}
            />
            <LessonCallout variant="tip" label="The Math">
              Even with 20% agency commission, the coordinated PK battles, event alerts, and cheaper coin recharges typically result in higher net income than going solo.
            </LessonCallout>
          </section>

          {/* India Context */}
          <section id="india-context" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">India Context</span>
            </h2>
            <LessonTable
              columns={[
                { header: "Factor", key: "factor" },
                { header: "India Reality", key: "reality" },
                { header: "Impact", key: "impact" },
              ]}
              rows={[
                { factor: "City", reality: "No metro advantage", impact: "Patna host = Mumbai host" },
                { factor: "Language", reality: "Hindi works perfectly", impact: "Chatting category ideal" },
                { factor: "Internet", reality: "4G sufficient (1 Mbps)", impact: "No Wi-Fi needed" },
                { factor: "Payment", reality: "UPI/Paytm accepted", impact: "Coin recharge easy" },
                { factor: "Competition", reality: "Lower than YouTube", impact: "Faster discovery" },
                { factor: "Earning potential", reality: "₹1,162–58,300+/month", impact: "Part-time viable" },
              ]}
            />
          </section>

          {/* Myths */}
          <section id="myths" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">3 Myths</span> Corrected
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { myth: "\"You need thousands of followers to earn\"", fix: "Task income from Day 1 is independent of followers. 20,000 pts/day is guaranteed for female hosts regardless of viewer count." },
                { myth: "\"Agency takes 70% of your money\"", fix: "Agency commission is 4%–20%. The 70% figure is gift retention (what you keep from each gift), not agency cut." },
                { myth: "\"Only attractive people can earn on Poppo\"", fix: "Task income is gender-based, not appearance-based. Gift income depends on engagement and personality, not looks alone." },
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
            prev={{ slug: "/academy/how-to-become-poppo-host", title: "How to Become a Poppo Host" }}
            next={{ slug: "/academy/poppo-daily-tasks", title: "The Poppo Task System" }}
          />

          <div className="mt-8">
            <LessonCTA />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
