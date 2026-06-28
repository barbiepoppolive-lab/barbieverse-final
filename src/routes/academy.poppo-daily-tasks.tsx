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
const CANONICAL_URL = `${BASE_URL}/academy/poppo-daily-tasks`;

const FAQ_DATA = [
  { q: "What time do Poppo daily tasks reset?", a: "Daily tasks reset at 5:30 AM IST (Indian Standard Time) every morning. Weekly tasks reset on Monday at 1:29 AM IST." },
  { q: "How many task points do female/male hosts get in Week 1?", a: "Female hosts: 20,000 pts/day. Male hosts: 10,000 pts/day. Streaming 2 hours per day triggers the daily task reward." },
  { q: "What is the ongoing solo live task after Week 1?", a: "After Week 1, solo live tasks vary by salary tier — from 5,000 pts/day (Tier D) up to 30,000 pts/day (Tier S-IDOL)." },
  { q: "What is the Crown Seat and how much does it pay?", a: "Crown Seat pays 800 pts/hour for simply sitting in a designated seat in a party room. No active streaming required." },
  { q: "What is the Party Seat task?", a: "Party Seat pays 1,000 pts/hour when you participate in a party room with at least 3 other hosts. Higher engagement = higher reward." },
  { q: "Do tasks auto-credit or do I need to claim them?", a: "Most tasks require manual claiming. Go to Tasks → click Claim next to each completed task. Forgetting to claim = losing the reward." },
];

const TOC = [
  { id: "intro", label: "Introduction" },
  { id: "two-types", label: "Two Types of Tasks" },
  { id: "solo-live-week1", label: "Solo Live — Week 1" },
  { id: "solo-live-ongoing", label: "Solo Live — Ongoing" },
  { id: "crown-seat", label: "Crown Seat Task" },
  { id: "party-seat", label: "Party Seat Task" },
  { id: "pk-battle", label: "PK Battle Task" },
  { id: "chat-message", label: "Chat Message Task" },
  { id: "treasure-box", label: "Treasure Box Task" },
  { id: "all-tasks-table", label: "All Tasks Reference" },
  { id: "full-day", label: "Full Optimized Day" },
  { id: "claim-mistake", label: "The #1 Mistake" },
  { id: "events", label: "Event Tasks" },
  { id: "withdrawal-timeline", label: "Withdrawal Timeline" },
  { id: "barbieverse-tips", label: "BarbieVerse Tips" },
  { id: "mistakes", label: "5 Mistakes" },
  { id: "faq-section", label: "FAQ" },
];

export const Route = createFileRoute("/academy/poppo-daily-tasks")({
  head: () => ({
    meta: [
      { title: "Poppo Live Task System Explained — Earn ₹166/Day Without Any Viewers (2025) | Barbieverse" },
      { name: "description", content: "Poppo Live's task system guarantees income from Day 1 — no followers, no viewers needed. Every task type, exact points per task, the daily reset time in IST, and the #1 mistake that makes hosts lose rewards." },
      { name: "keywords", content: "poppo live daily tasks, poppo live task system india, vone live daily task points" },
      { property: "og:title", content: "Poppo Live Task System Explained — Earn ₹166/Day Without Any Viewers (2025)" },
      { property: "og:description", content: "Poppo Live's task system guarantees income from Day 1 — no followers, no viewers needed." },
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
          headline: "Poppo Live Task System Explained — Earn ₹166/Day Without Any Viewers (2025)",
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
            { "@type": "ListItem", position: 3, name: "Poppo Daily Tasks", item: CANONICAL_URL },
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
  component: PoppoDailyTasks,
});

function PoppoDailyTasks() {
  return (
    <SiteLayout>
      <LessonHero
        lessonNumber={6}
        title="The Poppo Task System"
        subtitle="How to Earn ₹166/Day Without a Single Viewer"
        readTime="12 min read"
        difficulty="Beginner Friendly"
      />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <LessonTOC items={TOC} />

          {/* Intro */}
          <section id="intro" className="mb-16 scroll-mt-20">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 backdrop-blur-md sm:p-8">
              <p className="font-display text-lg font-medium italic text-foreground sm:text-xl">
                "You don't need a single viewer to earn on Poppo Live. The task system pays you from Day 1 — if you know how it works."
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Poppo's task system is designed so that even brand-new hosts with zero followers can earn guaranteed income. The key is understanding the reset times, the claiming process, and which tasks to prioritise.
              </p>
            </div>
          </section>

          {/* Two Types */}
          <section id="two-types" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Two Types</span> of Tasks
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                <strong className="text-foreground">Daily Tasks:</strong> Reset every day at <strong className="text-foreground">5:30 AM IST</strong>. Complete them before midnight to earn guaranteed points.
              </p>
              <p>
                <strong className="text-foreground">Weekly Tasks:</strong> Reset every <strong className="text-foreground">Monday at 1:29 AM IST</strong>. These are higher-reward tasks that span the full week.
              </p>
            </div>
          </section>

          {/* Solo Live Week 1 */}
          <section id="solo-live-week1" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Solo Live</span> — Week 1
            </h2>
            <LessonTable
              columns={[
                { header: "Host Gender", key: "gender" },
                { header: "Daily Points", key: "pts" },
                { header: "Daily ₹", key: "dailyRs" },
                { header: "7-Day Total ₹", key: "total" },
              ]}
              rows={[
                { gender: "Female", pts: "20,000 pts", dailyRs: "₹166", total: "₹1,162" },
                { gender: "Male", pts: "10,000 pts", dailyRs: "₹83", total: "₹581" },
              ]}
            />
            <LessonCallout variant="warning">
              Week 1 tasks require streaming for at least 2 hours each day. Miss one day and the streak resets completely.
            </LessonCallout>
          </section>

          {/* Solo Live Ongoing */}
          <section id="solo-live-ongoing" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Solo Live</span> — Ongoing (After Week 1)
            </h2>
            <LessonTable
              columns={[
                { header: "Tier", key: "tier" },
                { header: "Daily Points", key: "pts" },
                { header: "Daily ₹", key: "dailyRs" },
                { header: "Monthly ₹", key: "monthly" },
              ]}
              rows={[
                { tier: "D", pts: "5,000", dailyRs: "₹41", monthly: "₹1,230" },
                { tier: "C", pts: "10,000", dailyRs: "₹83", monthly: "₹2,490" },
                { tier: "B", pts: "15,000", dailyRs: "₹124", monthly: "₹3,720" },
                { tier: "A", pts: "20,000", dailyRs: "₹166", monthly: "₹4,980" },
                { tier: "S", pts: "25,000", dailyRs: "₹207", monthly: "₹6,210" },
                { tier: "S-IDOL", pts: "30,000", dailyRs: "₹249", monthly: "₹7,470" },
              ]}
            />
          </section>

          {/* Crown Seat */}
          <section id="crown-seat" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Crown Seat</span> Task
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                The Crown Seat pays <strong className="text-foreground">800 pts/hour</strong> for simply sitting in a designated seat in a party room. No active streaming required — just be present.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Hours in Crown Seat", key: "hours" },
                { header: "Points Earned", key: "pts" },
                { header: "₹ Equivalent", key: "rupees" },
              ]}
              rows={[
                { hours: "1 hour", pts: "800", rupees: "₹6.64" },
                { hours: "2 hours", pts: "1,600", rupees: "₹13.28" },
                { hours: "4 hours", pts: "3,200", rupees: "₹26.56" },
                { hours: "8 hours", pts: "6,400", rupees: "₹53.12" },
              ]}
            />
          </section>

          {/* Party Seat */}
          <section id="party-seat" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Party Seat</span> Task
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Party Seat pays <strong className="text-foreground">1,000 pts/hour</strong> when you participate in a party room with at least 3 other hosts. Higher engagement = higher reward.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Hours in Party Seat", key: "hours" },
                { header: "Points Earned", key: "pts" },
                { header: "₹ Equivalent", key: "rupees" },
              ]}
              rows={[
                { hours: "1 hour", pts: "1,000", rupees: "₹8.30" },
                { hours: "2 hours", pts: "2,000", rupees: "₹16.60" },
                { hours: "4 hours", pts: "4,000", rupees: "₹33.20" },
                { hours: "6 hours", pts: "6,000", rupees: "₹49.80" },
              ]}
            />
          </section>

          {/* PK Battle */}
          <section id="pk-battle" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">PK Battle</span> Task
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Each PK Battle earns <strong className="text-foreground">1,000 pts</strong> regardless of outcome. Winning earns bonus points on top.
              </p>
            </div>
          </section>

          {/* Chat Message */}
          <section id="chat-message" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Chat Message</span> Task
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Each chat message sent during a live stream earns <strong className="text-foreground">7 pts</strong>. Small but adds up with consistent participation.
              </p>
            </div>
          </section>

          {/* Treasure Box */}
          <section id="treasure-box" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Treasure Box</span> Task
            </h2>
            <LessonImage
              src="https://downloadr2.apkmirror.com/wp-content/uploads/2026/05/20/Poppo-Live-com.baitu.qingshu-2.jpg"
              alt="Poppo Live Explore page showing Activity section and stream categories"
              caption="Complete daily tasks from the Activity section — earn bonus points for streaming and engagement"
            />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Open the Treasure Box daily to earn up to <strong className="text-foreground">400 coins/day</strong>. Free to open — no spending required.
              </p>
            </div>
          </section>

          {/* All Tasks Table */}
          <section id="all-tasks-table" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">All Tasks</span> Reference
            </h2>
            <LessonTable
              columns={[
                { header: "Task", key: "task" },
                { header: "Points", key: "pts" },
                { header: "Frequency", key: "freq" },
                { header: "Requirement", key: "req" },
              ]}
              rows={[
                { task: "Solo Live (Week 1 Female)", pts: "20,000", freq: "Daily", req: "2 hrs streaming" },
                { task: "Solo Live (Week 1 Male)", pts: "10,000", freq: "Daily", req: "2 hrs streaming" },
                { task: "Solo Live (Ongoing)", pts: "5,000–30,000", freq: "Daily", req: "By tier" },
                { task: "Crown Seat", pts: "800/hr", freq: "Per hour", req: "Sit in Crown Seat" },
                { task: "Party Seat", pts: "1,000/hr", freq: "Per hour", req: "3+ hosts in room" },
                { task: "PK Battle", pts: "1,000", freq: "Per battle", req: "Enter PK" },
                { task: "Chat Message", pts: "7", freq: "Per message", req: "Send in live room" },
                { task: "Treasure Box", pts: "400 coins", freq: "Daily", req: "Open box" },
              ]}
            />
          </section>

          {/* Full Day */}
          <section id="full-day" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Full Optimized</span> Day Schedule
            </h2>
            <LessonTable
              columns={[
                { header: "Time (IST)", key: "time" },
                { header: "Activity", key: "activity" },
                { header: "Points Earned", key: "pts" },
              ]}
              rows={[
                { time: "5:30 AM", activity: "Tasks reset — claim yesterday's rewards", pts: "—" },
                { time: "6:00 AM", activity: "Open Treasure Box", pts: "400 coins" },
                { time: "10:00 AM", activity: "Solo Live stream (2 hrs)", pts: "20,000" },
                { time: "12:00 PM", activity: "Claim solo live task", pts: "Claimed" },
                { time: "2:00 PM", activity: "Crown Seat (2 hrs)", pts: "1,600" },
                { time: "4:00 PM", activity: "Party Room participation (2 hrs)", pts: "2,000" },
                { time: "6:00 PM", activity: "PK Battle (1 battle)", pts: "1,000" },
                { time: "8:00 PM", activity: "Evening live stream (2 hrs)", pts: "Gift income" },
                { time: "10:00 PM", activity: "Chat messages throughout day", pts: "50–100" },
              ]}
            />
            <LessonCallout variant="tip" label="Daily Total">
              Task income alone: 25,000–26,000 pts = ₹207–215/day = ₹6,210–6,450/month. Gift income is additional.
            </LessonCallout>
          </section>

          {/* Claim Mistake */}
          <section id="claim-mistake" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">The #1 Mistake</span> That Loses Rewards
            </h2>
            <LessonCallout variant="danger" label="Critical">
              Most new hosts complete tasks but forget to <strong>manually claim</strong> them. Unclaimed rewards disappear when tasks reset. Go to Tasks → click Claim next to every completed task before 5:30 AM IST.
            </LessonCallout>
          </section>

          {/* Events */}
          <section id="events" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Event Tasks</span> with Multipliers
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                During special events, Poppo offers <strong className="text-foreground">multiplier bonuses</strong> on standard tasks. These can double or triple your normal task income for limited periods.
              </p>
            </div>
            <LessonCallout variant="info">
              BarbieVerse provides advance notice of upcoming events so you can plan your streaming schedule to maximise multiplier periods.
            </LessonCallout>
          </section>

          {/* Withdrawal Timeline */}
          <section id="withdrawal-timeline" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Withdrawal Timeline</span>
            </h2>
            <LessonTable
              columns={[
                { header: "Milestone", key: "milestone" },
                { header: "Points Required", key: "pts" },
                { header: "Timeframe", key: "time" },
              ]}
              rows={[
                { milestone: "First withdrawal eligible", pts: "100,000 ($10)", time: "Week 2–3" },
                { milestone: "Weekly withdrawal cycle", pts: "100,000 minimum", time: "Every Sunday" },
                { milestone: "Monthly earnings (tasks only)", pts: "300,000–750,000", time: "Month 1" },
              ]}
            />
          </section>

          {/* BarbieVerse Tips */}
          <section id="barbieverse-tips" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">BarbieVerse</span> Task Tips
            </h2>
            <div className="mt-6 space-y-3">
              {[
                "Set a daily alarm for 5:30 AM IST to claim tasks before reset",
                "Use BarbieVerse's event calendar to know when multipliers are active",
                "Join coordinated party rooms via BarbieVerse for guaranteed Party Seat hours",
                "Track your daily points in a spreadsheet to monitor tier progression",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/30 p-4 backdrop-blur-md">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{i + 1}</span>
                  <p className="text-sm text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Mistakes */}
          <section id="mistakes" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">5 Mistakes</span> That Cost You Money
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { myth: "Not claiming tasks manually", fix: "Every task must be claimed before 5:30 AM IST reset. Unclaimed = lost forever." },
                { myth: "Streaming less than 2 hours", fix: "Solo live tasks require minimum 2 hours. 1 hour 59 minutes = zero task credit." },
                { myth: "Ignoring Crown Seat and Party Seat", fix: "These passive tasks earn ₹6.64–8.30/hour with zero effort. Stack them with other activities." },
                { myth: "Not checking reset times", fix: "Daily reset: 5:30 AM IST. Weekly reset: Monday 1:29 AM IST. Plan around these." },
                { myth: "Missing event multiplier windows", fix: "Events can double/triple task income. BarbieVerse gives advance notice — use it." },
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
            prev={{ slug: "/academy/poppo-live-earning-india", title: "How Much Can You Earn" }}
            next={{ slug: "/academy/pk-battle-guide", title: "PK Battles Explained" }}
          />

          <div className="mt-8">
            <LessonCTA />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
