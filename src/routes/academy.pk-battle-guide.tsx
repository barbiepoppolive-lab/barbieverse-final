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
const CANONICAL_URL = `${BASE_URL}/academy/pk-battle-guide`;

const FAQ_DATA = [
  { q: "What format does PK come in on Poppo Live?", a: "3 formats: 1v1 Solo PK, Team PK (3v3), and Group PK. Each has different rules and scoring." },
  { q: "Is there an entry fee for PK battles?", a: "No entry fee. You spend coins on gifts during the battle to boost your score. No coins = no points earned." },
  { q: "How is the winner scored?", a: "1,000 coins spent = 700 points earned. The host with more total gift points at the end wins." },
  { q: "What do winner and loser get?", a: "Winner gets bonus points + the gift points from their viewers. Loser still keeps their gift points — there's no penalty for losing." },
  { q: "When is the best time for PK battles?", a: "Peak hours IST: 7 PM–11 PM. Highest viewer activity means more potential gift support from your audience." },
  { q: "What is a low-spend PK strategy?", a: "Coordinate with BarbieVerse hosts for small, scheduled battles where both sides keep spending minimal. Both earn task points without heavy gift investment." },
];

const TOC = [
  { id: "why-different", label: "Why PK Is Different" },
  { id: "formats", label: "3 PK Formats" },
  { id: "duration", label: "Duration Options" },
  { id: "requirements", label: "Requirements" },
  { id: "how-to-start", label: "How to Start a PK" },
  { id: "scoring", label: "Scoring System" },
  { id: "phase-structure", label: "30-Minute Phase Structure" },
  { id: "psychology", label: "PK Psychology" },
  { id: "earnings", label: "Earning Scenarios" },
  { id: "low-spend", label: "Low-Spend Strategy" },
  { id: "timing", label: "Peak Hours IST" },
  { id: "barbieverse-pk", label: "BarbieVerse PK System" },
  { id: "mistakes", label: "5 Mistakes" },
  { id: "faq-section", label: "FAQ" },
];

export const Route = createFileRoute("/academy/pk-battle-guide")({
  head: () => ({
    meta: [
      { title: "Poppo Live PK Battle Explained — Rules, Strategy & How to Win (India Guide 2025) | Barbieverse" },
      { name: "description", content: "PK battles are Poppo's highest-earning activity. All 3 formats, the exact 30-minute phase structure, the final-minute multiplier window, gift timing strategy, and the BarbieVerse coordinated battle system." },
      { name: "keywords", content: "poppo live pk battle kya hai, poppo live pk battle how it works, poppo pk battle strategy" },
      { property: "og:title", content: "Poppo Live PK Battle Explained — Rules, Strategy & How to Win (India Guide 2025)" },
      { property: "og:description", content: "PK battles are Poppo's highest-earning activity. All 3 formats, the exact 30-minute phase structure, and gift timing strategy." },
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
          headline: "Poppo Live PK Battle Explained — Rules, Strategy & How to Win (India Guide 2025)",
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
            { "@type": "ListItem", position: 3, name: "PK Battle Guide", item: CANONICAL_URL },
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
  component: PKBattleGuide,
});

function PKBattleGuide() {
  return (
    <SiteLayout>
      <LessonHero
        lessonNumber={7}
        title="PK Battles Explained"
        subtitle="Rules, Strategy, and How to Win Without Overspending"
        readTime="13 min read"
        difficulty="Intermediate"
      />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <LessonTOC items={TOC} />

          {/* Why Different */}
          <section id="why-different" className="mb-16 scroll-mt-20">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 backdrop-blur-md sm:p-8">
              <p className="font-display text-lg font-medium italic text-foreground sm:text-xl">
                "PK battles are the highest-earning activity on Poppo Live — and the most misunderstood."
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Unlike regular streaming where income comes from passive gifts, PK battles create urgency, competition, and concentrated spending. A single 30-minute PK can earn more than 3 hours of regular streaming.
              </p>
            </div>
          </section>

          {/* Formats */}
          <section id="formats" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">3 PK Formats</span>
            </h2>
            <LessonImage
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop"
              alt="Two competitors facing off in a live gaming competition"
              caption="PK battles pit two hosts against each other — viewers send gifts to crown a winner"
            />
            <LessonTable
              columns={[
                { header: "Format", key: "format" },
                { header: "Participants", key: "participants" },
                { header: "Best For", key: "best" },
                { header: "Earning Potential", key: "earning" },
              ]}
              rows={[
                { format: "1v1 Solo PK", participants: "2 hosts", best: "Direct competition", earning: "High" },
                { format: "Team PK (3v3)", participants: "6 hosts (3v3)", best: "Group coordination", earning: "Very High" },
                { format: "Group PK", participants: "Multiple hosts", best: "Large events", earning: "Highest" },
              ]}
            />
          </section>

          {/* Duration */}
          <section id="duration" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Duration</span> Options
            </h2>
            <LessonTable
              columns={[
                { header: "Duration", key: "duration" },
                { header: "Best For", key: "best" },
                { header: "Typical Spend", key: "spend" },
              ]}
              rows={[
                { duration: "5 minutes", best: "Quick battles, testing", spend: "Low" },
                { duration: "10 minutes", best: "Standard PK", spend: "Medium" },
                { duration: "15 minutes", best: "Extended battles", spend: "Medium-High" },
                { duration: "30 minutes", best: "Full strategy PK", spend: "High" },
              ]}
            />
          </section>

          {/* Requirements */}
          <section id="requirements" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Requirements</span>
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <ul className="list-disc space-y-2 pl-5">
                <li><strong className="text-foreground">Level 5+:</strong> Must reach Level 5 before accessing PK battles</li>
                <li><strong className="text-foreground">Live stream active:</strong> Must be currently streaming to initiate or accept a PK</li>
                <li><strong className="text-foreground">Coin balance:</strong> Viewers need coins to send gifts during the battle</li>
                <li><strong className="text-foreground">Both hosts live:</strong> Both participants must be actively streaming</li>
              </ul>
            </div>
          </section>

          {/* How to Start */}
          <section id="how-to-start" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">How to Start</span> a PK Battle
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <ol className="list-decimal space-y-3 pl-5">
                <li><strong className="text-foreground">Go live</strong> — start your stream normally</li>
                <li><strong className="text-foreground">Tap the PK icon</strong> in your live room controls</li>
                <li><strong className="text-foreground">Choose format:</strong> 1v1, Team, or Group</li>
                <li><strong className="text-foreground">Select duration:</strong> 5, 10, 15, or 30 minutes</li>
                <li><strong className="text-foreground">Invite opponent</strong> or accept an incoming challenge</li>
                <li><strong className="text-foreground">Battle begins</strong> — viewers send gifts to boost your score</li>
              </ol>
            </div>
          </section>

          {/* Scoring */}
          <section id="scoring" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Scoring</span> System
            </h2>
            <LessonCallout variant="info" label="The Core Formula">
              <strong>1,000 coins spent = 700 points earned</strong><br />
              The host with more total points at the end wins. Both hosts keep their earned points regardless of outcome.
            </LessonCallout>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                <strong className="text-foreground">Winning:</strong> Bonus points + all gift points earned during battle<br />
                <strong className="text-foreground">Losing:</strong> Still keeps all gift points earned — no penalty
              </p>
            </div>
          </section>

          {/* Phase Structure */}
          <section id="phase-structure" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">30-Minute Phase</span> Structure
            </h2>
            <LessonTable
              columns={[
                { header: "Phase", key: "phase" },
                { header: "Time", key: "time" },
                { header: "What Happens", key: "happens" },
                { header: "Strategy", key: "strategy" },
              ]}
              rows={[
                { phase: "Opening", time: "0–5 min", happens: "Initial gifts, testing opponent", strategy: "Start small to gauge support" },
                { phase: "Conservation", time: "5–15 min", happens: "Steady gift flow, building score", strategy: "Maintain consistent spending" },
                { phase: "Hold", time: "15–25 min", happens: "Score stabilises,双方 conserve", strategy: "Save coins for final burst" },
                { phase: "Final Burst", time: "25–30 min", happens: "Multiplier window, heavy spending", strategy: "Spend biggest gifts here — 2x multiplier" },
              ]}
            />
            <LessonCallout variant="warning" label="Final Minute Multiplier">
              The last 5 minutes have a <strong>2x point multiplier</strong>. A 1,000-coin gift in the final minutes = 1,400 points instead of 700. Timing your biggest gifts here is the key to winning.
            </LessonCallout>
          </section>

          {/* Psychology */}
          <section id="psychology" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">PK Psychology</span>
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { term: "Bluff", desc: "Start strong to make opponent think you have more support than you do. They may conserve coins thinking they can't win." },
                { term: "Momentum", desc: "Build a lead early to encourage your viewers to keep supporting. People like backing a winner." },
                { term: "FOMO", desc: "Announce PK battles in advance so your viewers plan to be present. Missing a battle = missing the earning opportunity." },
                { term: "Briefing", desc: "Tell your top supporters the strategy before the battle. 'Save your big gifts for the last 5 minutes' is the most effective briefing." },
              ].map((p, i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card/30 p-4 backdrop-blur-md">
                  <p className="text-sm font-bold text-primary">{p.term}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Earnings */}
          <section id="earnings" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Earning</span> Scenarios
            </h2>
            <LessonTable
              columns={[
                { header: "Scenario", key: "scenario" },
                { header: "Viewer Spend (coins)", key: "spend" },
                { header: "Points Earned", key: "pts" },
                { header: "₹ Earned", key: "rupees" },
              ]}
              rows={[
                { scenario: "Small PK (5 min)", spend: "5,000", pts: "3,500", rupees: "₹29" },
                { scenario: "Standard PK (10 min)", spend: "20,000", pts: "14,000", rupees: "₹116" },
                { scenario: "Coordinated PK (30 min)", spend: "100,000", pts: "70,000", rupees: "₹580" },
                { scenario: "Large PK with supporters", spend: "500,000", pts: "350,000", rupees: "₹2,905" },
              ]}
            />
          </section>

          {/* Low Spend */}
          <section id="low-spend" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Low-Spend</span> Strategy
            </h2>
            <LessonTable
              columns={[
                { header: "Approach", key: "approach" },
                { header: "Duration", key: "duration" },
                { header: "Both Sides Spend", key: "spend" },
                { header: "Both Earn", key: "earn" },
              ]}
              rows={[
                { approach: "Quick test PK", duration: "5 min", spend: "2,000–5,000 coins", earn: "1,400–3,500 pts each" },
                { approach: "Scheduled mutual PK", duration: "10 min", spend: "10,000–20,000 coins", earn: "7,000–14,000 pts each" },
                { approach: "BarbieVerse coordinated", duration: "15 min", spend: "30,000–50,000 coins", earn: "21,000–35,000 pts each" },
              ]}
            />
            <LessonCallout variant="tip" label="BarbieVerse Low-Spend System">
              BarbieVerse coordinates PK battles between agency hosts where both sides agree on spending limits. Both hosts earn task points + gift income without excessive coin investment.
            </LessonCallout>
          </section>

          {/* Timing */}
          <section id="timing" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Peak Hours</span> IST
            </h2>
            <LessonTable
              columns={[
                { header: "Time (IST)", key: "time" },
                { header: "Viewer Activity", key: "activity" },
                { header: "PK Recommendation", key: "rec" },
              ]}
              rows={[
                { time: "6 AM – 12 PM", activity: "Low", rec: "Avoid PK — few viewers" },
                { time: "12 PM – 4 PM", activity: "Medium", rec: "Small PKs OK" },
                { time: "4 PM – 7 PM", activity: "High", rec: "Good for PK battles" },
                { time: "7 PM – 11 PM", activity: "Peak", rec: "Best time for PK — maximum gifts" },
                { time: "11 PM – 2 AM", activity: "Medium", rec: "Late-night PKs possible" },
              ]}
            />
          </section>

          {/* BarbieVerse PK */}
          <section id="barbieverse-pk" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">BarbieVerse</span> PK Coordination System
            </h2>
            <LessonTable
              columns={[
                { header: "Phase", key: "phase" },
                { header: "When", key: "when" },
                { header: "What Happens", key: "happens" },
              ]}
              rows={[
                { phase: "Planning", when: "48 hours before", happens: "Opponent selected, format decided, spending cap agreed" },
                { phase: "Briefing", when: "30 minutes before", happens: "Both hosts brief their top supporters on strategy" },
                { phase: "Battle", when: "During PK", happens: "Coordinated gift timing, real-time score tracking" },
              ]}
            />
          </section>

          {/* Mistakes */}
          <section id="mistakes" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">5 Mistakes</span> in PK Battles
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { myth: "Spending big in the first minute", fix: "Save your biggest gifts for the final 5 minutes when the 2x multiplier is active." },
                { myth: "Not briefing your supporters", fix: "Tell your top viewers the strategy beforehand. 'Save for the last 5 minutes' is the most effective briefing." },
                { myth: "Accepting random PK challenges", fix: "Random opponents may have massive supporter bases. Coordinate through BarbieVerse for balanced matchups." },
                { myth: "PK during low-activity hours", fix: "7 PM–11 PM IST is peak. PK during the day = fewer viewers = fewer gifts = lower earnings." },
                { myth: "Giving up when behind early", fix: "The 2x multiplier in the final minutes means a small lead can be overturned instantly. Stay until the end." },
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
            prev={{ slug: "/academy/poppo-daily-tasks", title: "The Poppo Task System" }}
            next={{ slug: "/academy/poppo-withdrawal-guide", title: "How to Withdraw Money" }}
          />

          <div className="mt-8">
            <LessonCTA />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
