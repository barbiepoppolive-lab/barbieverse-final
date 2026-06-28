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
import { Smartphone, Users, Gift, TrendingUp, Eye, Radio, Swords, MessageCircle, Zap, ChevronRight } from "lucide-react";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://barbieverse.org";
const CANONICAL_URL = `${BASE_URL}/academy/what-is-poppo-live`;

const FAQ_DATA = [
  { q: "Who made Poppo Live?", a: "Poppo Live is made by Vshow PTE. LTD., registered in Singapore. The app launched in 2022." },
  { q: "Is Poppo Live available in India?", a: "Yes. In India, the app is called Vone Live — same company, same system, just a different brand name for regulatory compliance." },
  { q: "How much can a host earn on Poppo Live?", a: "Hosts earn 70% of every gift as points. 10,000 points = $1 USD ≈ ₹83. Week 1 female hosts earn ₹1,162 from task rewards alone." },
  { q: "Do I need followers to start earning?", a: "No. Task rewards pay from Day 1 regardless of follower count. You can start earning immediately after going live." },
  { q: "Can I stream in Hindi?", a: "Yes. Vone supports Hindi as an interface language. The Chatting category works in Hindi, regional languages, or Hinglish equally well." },
                { q: "What equipment do I need to start?", a: "Just your phone. Android 5.0+ or iOS 13.0+, minimum 1 Mbps upload internet, and a well-lit room. Total startup cost: ₹0." },
  { q: "What is the minimum withdrawal amount?", a: "100,000 points = $10 USD ≈ ₹830. This is the minimum for any withdrawal request." },
  { q: "How long does withdrawal take?", a: "Epay: 1-3 days. USDT: under 15 minutes off-peak. Bank transfer: 3-7 days. Withdrawal requests must be submitted before Monday 1:29 AM IST." },
];

const TOC = [
  { id: "one-line", label: "One Line Explanation" },
  { id: "who-made-it", label: "Who Made It" },
  { id: "india-vone", label: "India: Vone, Not Poppo" },
  { id: "three-types", label: "3 Types of People" },
  { id: "six-things", label: "6 Things You Can Do" },
  { id: "money-works", label: "How the Money Works" },
  { id: "pk-battle", label: "What Is a PK Battle?" },
  { id: "comparison", label: "Poppo vs YouTube vs Instagram" },
  { id: "checklist", label: "New Joiner Checklist" },
  { id: "mistakes", label: "5 Mistakes to Avoid" },
  { id: "faq-section", label: "FAQ" },
];

export const Route = createFileRoute("/academy/what-is-poppo-live")({
  head: () => ({
    meta: [
      { title: "What Is Poppo Live? Simple Guide for New Joiners in India (2025) | Barbieverse" },
      { name: "description", content: "Poppo Live is a live streaming app by Vshow PTE. LTD. where hosts earn real money from viewer gifts. Learn what it is, who it's for, and why India uses Vone instead." },
      { name: "keywords", content: "what is poppo live, poppo live kya hai, vone app india, poppo live india" },
      { property: "og:title", content: "What Is Poppo Live? Simple Guide for New Joiners in India (2025)" },
      { property: "og:description", content: "Poppo Live is a live streaming app where hosts earn real money from viewer gifts. Simple guide for Indian creators." },
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
          headline: "What Is Poppo Live? Simple Guide for New Joiners in India (2025)",
          description: "Poppo Live is a live streaming app by Vshow PTE. LTD. where hosts earn real money from viewer gifts.",
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
            { "@type": "ListItem", position: 3, name: "What Is Poppo Live?", item: CANONICAL_URL },
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
  component: WhatIsPoppoLive,
});

function WhatIsPoppoLive() {
  return (
    <SiteLayout>
      <LessonHero
        lessonNumber={1}
        title="What Is Poppo Live?"
        subtitle="Simple Guide for New Joiners"
        readTime="8 min read"
        difficulty="Beginner Friendly"
      />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <LessonTOC items={TOC} />

          {/* One Line */}
          <section id="one-line" className="mb-16 scroll-mt-20">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 backdrop-blur-md sm:p-8">
              <p className="font-display text-lg font-medium italic text-foreground sm:text-xl">
                "Poppo Live is an app where you go live on your phone, people watch you, send you virtual gifts — and those gifts turn into real money in your bank account."
              </p>
            </div>
          </section>

          {/* Who Made It */}
          <section id="who-made-it" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Who Made It</span> and How Big Is It?
            </h2>
            <LessonImage
              src="https://downloadr2.apkmirror.com/wp-content/uploads/2026/05/20/Poppo-Live-com.baitu.qingshu-2.jpg"
              alt="Poppo Live app Explore page showing live stream categories and the LIVE button"
              caption="Poppo Live home screen — browse Singing, Chatting, and Dancing streams or tap LIVE to start your own"
            />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Poppo Live is made by <strong className="text-foreground">Vshow PTE. LTD.</strong>, registered in Singapore. The app launched in 2022.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Stat", key: "stat" },
                { header: "Detail", key: "detail" },
              ]}
              rows={[
                { stat: "Downloads", detail: "40 million+ on Google Play" },
                { stat: "Rating", detail: "4.2 out of 5 stars (229K+ reviews)" },
                { stat: "Languages", detail: "23 languages including Hindi, Bengali, Urdu" },
                { stat: "Age Rating", detail: "16+ with built-in profanity filters" },
                { stat: "App Size", detail: "~344 MB (iOS) / ~140 MB (Android)" },
                { stat: "Requirements", detail: "iOS 13.0+ or Android 5.0+" },
                { stat: "Support Email", detail: "official@poppolive.com" },
                { stat: "Website", detail: "poppo.com" },
                { stat: "Agency Portal", detail: "poppoliveagencyapp.com" },
              ]}
            />
          </section>

          {/* India Vone */}
          <section id="india-vone" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">India:</span> Search Vone Live, Not Poppo Live
            </h2>
            <LessonCallout variant="warning" label="Critical for Indian Users">
              In India, the app is called <strong>VONE LIVE</strong> — not Poppo Live. If you search "Poppo Live" on Google Play in India, you won't find it. Search <strong>"Vone Live"</strong> instead. It's the same app, same backend, same company — just a different brand name for India due to regulatory requirements.
            </LessonCallout>
            <LessonTable
              columns={[
                { header: "Feature", key: "feature" },
                { header: "Poppo Live", key: "poppo" },
                { header: "Vone Live (India)", key: "vone" },
              ]}
              rows={[
                { feature: "Company", poppo: "Vshow PTE. LTD.", vone: "Vshow PTE. LTD." },
                { feature: "Earning system", poppo: "Identical", vone: "Identical" },
                { feature: "Coins & withdrawal", poppo: "Identical", vone: "Identical" },
                { feature: "Agency system", poppo: "Identical", vone: "Identical" },
                { feature: "Where to download", poppo: "Play Store / App Store", vone: "Google Play India" },
                { feature: "App size (Android)", poppo: "~100 MB", vone: "~100 MB" },
              ]}
            />
            <LessonCallout variant="info">
              Every lesson in BarbieVerse Academy applies to Vone Live users. Wherever you read "Poppo", read "Vone". The system is 100% identical.
            </LessonCallout>
          </section>

          {/* Three Types */}
          <section id="three-types" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">3 Types</span> of People on Poppo / Vone
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Radio, title: "Host", desc: "Goes live on the app. Earns from viewer gifts.", color: "text-primary" },
                { icon: Eye, title: "Viewer", desc: "Watches streams. Buys coins to send as gifts. Watching is free.", color: "text-accent" },
                { icon: Users, title: "Agent", desc: "Manages a team of hosts. Earns 4%–20% commission. Does not stream personally.", color: "text-gold" },
              ].map((type) => (
                <div key={type.title} className="rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-md">
                  <type.icon className={`h-8 w-8 ${type.color}`} />
                  <h3 className="mt-3 font-display text-lg font-bold">{type.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{type.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Six Things */}
          <section id="six-things" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">6 Things</span> You Can Do on the App
            </h2>
            <LessonTable
              columns={[
                { header: "Activity", key: "activity" },
                { header: "What It Is", key: "what" },
                { header: "Who Does It", key: "who" },
              ]}
              rows={[
                { activity: "🎙️ Solo Live", what: "Stream alone. Viewers watch and gift.", who: "Hosts" },
                { activity: "⚔️ PK Battle", what: "Two hosts compete. Gifts decide the winner. Duration: 30 minutes.", who: "Hosts" },
                { activity: "🎉 Party Room", what: "Group live room — multiple hosts on screen together.", who: "Hosts + Viewers" },
                { activity: "💬 1v1 Private Match", what: "Private video/voice with one viewer. Earns 1,400–4,200 points/minute.", who: "Hosts" },
                { activity: "📱 Moments / VLOGs", what: "Short videos between live sessions. Builds audience.", who: "Hosts" },
                { activity: "🎁 Treasure Box / Tasks", what: "Watch a stream for 5 min = 40 free coins. Up to 10 times per day = 400 free coins daily.", who: "Everyone" },
              ]}
            />
          </section>

          {/* Money Works */}
          <section id="money-works" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">How the Money Works</span> — 4 Steps
            </h2>
            <div className="mt-8 space-y-4">
              {[
                { step: "1", title: "Viewer buys COINS with real money (₹)", icon: TrendingUp },
                { step: "2", title: "Viewer sends GIFTS to Host during live stream", icon: Gift },
                { step: "3", title: "Host receives POINTS (70% of gift's coin value)", icon: Zap },
                { step: "4", title: "Host withdraws POINTS as real money to bank", icon: TrendingUp },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">{s.title}</h3>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-gold/20 bg-gold/5 p-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">The 3 numbers you must know:</strong><br />
                🔑 10,000 Points = $1 USD ≈ ₹83 (fixed rate, never changes)<br />
                🎁 Host keeps 70% of every gift as points<br />
                💳 Minimum withdrawal = 100,000 points = $10 ≈ ₹830
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Example:</strong> Viewer spends ₹830 on coins → gifts it all to you → you receive 70% = <strong className="text-foreground">₹580 in your wallet</strong>
              </p>
            </div>
          </section>

          {/* PK Battle */}
          <section id="pk-battle" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">What Is a PK Battle?</span>
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Two hosts appear side-by-side on screen. Their audiences send gifts. <strong className="text-foreground">Every 1,000 coins gifted = 700 rank points.</strong> The host with more points after 30 minutes wins. Winners keep all earned points plus a platform bonus. The final 60-90 seconds offer a 10-20% conversion bonus.
              </p>
              <p>
                Entry requires: Level 5 account + 1,000-coin entry fee (refunded to winners).
              </p>
              <p>
                Four battle types: <strong className="text-foreground">Friend PK</strong> (you pick your opponent), <strong className="text-foreground">Random PK</strong> (auto-matched), <strong className="text-foreground">Team PK</strong> (group format), and <strong className="text-foreground">Fan PK</strong> (audience-based).
              </p>
            </div>
          </section>

          {/* Comparison */}
          <section id="comparison" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Poppo vs YouTube</span> vs Instagram
            </h2>
            <LessonTable
              columns={[
                { header: "Feature", key: "feature" },
                { header: "YouTube", key: "youtube" },
                { header: "Instagram Live", key: "instagram" },
                { header: "Poppo / Vone", key: "poppo" },
              ]}
              rows={[
                { feature: "How you earn", youtube: "Ad revenue", instagram: "Brand deals", poppo: "Real-time viewer gifts" },
                { feature: "When you earn", youtube: "Weeks/months later", instagram: "Negotiated", poppo: "Same day you stream" },
                { feature: "Followers needed?", youtube: "Yes — 1,000 minimum", instagram: "Yes", poppo: "No — task income from Day 1" },
                { feature: "Equipment", youtube: "Camera, mic, editing", instagram: "Phone", poppo: "Phone only" },
                { feature: "First income", youtube: "3–6 months", instagram: "Months", poppo: "Week 1" },
                { feature: "Language barrier", youtube: "English favoured", instagram: "English favoured", poppo: "Hindi works perfectly" },
              ]}
            />
          </section>

          {/* Checklist */}
          <section id="checklist" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">New Joiner Checklist</h2>
            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[
                "Download Vone Live from Google Play (India) — it's free",
                "Create account with mobile number or Google",
                "Complete Face Authentication (selfie + head movement scan)",
                "Upload Live Cover Photo (your face, clearly visible, no filters)",
                "Reach Level 5 (1–2 days of watching streams and chatting)",
                "Confirm internet speed: minimum 1 Mbps upload, recommended 5 Mbps+",
                "Keep phone plugged in — streaming drains battery fast",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/30 p-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gradient-pink/15 text-[11px] font-semibold text-gold">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Cost to start: ₹0. Equipment: just your phone.</strong>
              </p>
            </div>
          </section>

          {/* Mistakes */}
          <section id="mistakes" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">5 Mistakes</span> New Joiners Make
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { myth: '"I need followers to earn."', fix: "Task rewards pay from Day 1 regardless of followers." },
                { myth: '"I\'ll make a second account for more earnings."', fix: "Multiple accounts = permanent ban on all accounts. Vone's AI cross-matches facial biometrics." },
                { myth: '"I searched Poppo Live in India but can\'t find it."', fix: "Search Vone Live on Google Play instead." },
                { myth: '"Gifts don\'t become real money."', fix: "Gifts → Points → Withdraw to bank via Epay/USDT. Real money, verified by millions of hosts." },
                { myth: '"I need to sing or dance."', fix: "Chatting / Talk is the most accessible category. Many top earners just talk." },
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
            prev={null}
            next={{ slug: "/academy/coins-points-gifts-explained", title: "Coins, Points & Gifts — How the Money Works" }}
          />

          <div className="mt-8">
            <LessonCTA />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
