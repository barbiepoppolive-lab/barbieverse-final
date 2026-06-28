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
const CANONICAL_URL = `${BASE_URL}/academy/vone-app-india`;

const FAQ_DATA = [
  { q: "What is Vone Live?", a: "Vone Live is India's official version of Poppo Live — same system, same company (Vshow PTE. LTD.), different brand name for regulatory compliance." },
  { q: "Can I download Poppo Live in India?", a: "No. Search 'Vone Live' on Google Play instead. It's the same app with a different name." },
  { q: "Is Vone Live the same as Poppo Live?", a: "Yes. Identical features, earning system, agency structure, and withdrawal methods. Only the brand name differs." },
  { q: "What internet speed do I need for Vone?", a: "Minimum 1 Mbps upload. Recommended: 5 Mbps+. Optimal for PK battles: 10 Mbps+." },
  { q: "When do I enter the Inviter ID?", a: "During signup only — it cannot be added after account creation. Enter it in the registration flow." },
  { q: "How much can I earn in Week 1 on Vone?", a: "Female hosts: ₹1,162 (20,000 pts/day × 7 days). Male hosts: ₹581 (10,000 pts/day × 7 days). Streaming 2 hours/day." },
  { q: "Does language matter on Vone?", a: "No. Hindi works perfectly in the Chatting category. Regional languages and Hinglish are equally effective." },
  { q: "Can I stream from any city in India?", a: "Yes. There is no advantage to being in a metro city. A host in Patna with 4G earns identically to one in Mumbai." },
];

const TOC = [
  { id: "confusion", label: "The Confusion" },
  { id: "comparison", label: "Vone vs Poppo — What's Different" },
  { id: "download", label: "How to Download Vone" },
  { id: "account-setup", label: "Account Setup" },
  { id: "level-5", label: "Reaching Level 5" },
  { id: "week-1", label: "Week 1 Earning Numbers" },
  { id: "india-opportunity", label: "Why Vone Is an Opportunity" },
  { id: "barbieverse", label: "Why Join BarbieVerse" },
  { id: "mistakes", label: "4 India-Specific Mistakes" },
  { id: "faq-section", label: "FAQ" },
];

export const Route = createFileRoute("/academy/vone-app-india")({
  head: () => ({
    meta: [
      { title: "Vone App India — Download, Setup & Start Earning on Poppo Live (2025) | Barbieverse" },
      { name: "description", content: "Indian users can't find Poppo Live because it's called Vone Live in India. This guide explains exactly what Vone is, how to download it, and what's identical to Poppo." },
      { name: "keywords", content: "vone app india, vone live kya hai, vone app download india, vone se paise kaise kamaye" },
      { property: "og:title", content: "Vone App India — Download, Setup & Start Earning on Poppo Live (2025)" },
      { property: "og:description", content: "Everything Indian creators need to know about Vone Live — the India version of Poppo." },
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
          headline: "Vone App India — Download, Setup & Start Earning on Poppo Live (2025)",
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
            { "@type": "ListItem", position: 3, name: "Vone App India", item: CANONICAL_URL },
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
  component: VoneAppIndia,
});

function VoneAppIndia() {
  return (
    <SiteLayout>
      <LessonHero
        lessonNumber={3}
        title="Vone App India"
        subtitle="Why India Uses a Different App — And What's Exactly the Same"
        readTime="9 min read"
        difficulty="Beginner Friendly"
      />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <LessonTOC items={TOC} />

          {/* Confusion */}
          <section id="confusion" className="mb-16 scroll-mt-20">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 backdrop-blur-md sm:p-8">
              <p className="font-display text-lg font-medium italic text-foreground sm:text-xl">
                "You searched 'Poppo Live' on Google Play in India. You couldn't find it. You assumed it wasn't available in India."
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                It is available. It's just called something different. In India, Poppo Live is called <strong className="text-foreground">VONE LIVE</strong>. Same company, same system.
              </p>
            </div>
          </section>

          {/* Comparison */}
          <section id="comparison" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Vone vs Poppo</span> — What's Actually Different?
            </h2>
            <LessonImage
              src="https://play-lh.googleusercontent.com/4aYfrPH_nHti2wbuubO0pijq89MdkQIlLGyFCpWdBIYHZQaihPwrR8w83nk1EGzrP3Y=w1080-h1920-rw"
              alt="Vone Live app home screen showing live streams and categories"
              caption="Vone Live — the India-focused version of the Poppo Live platform"
            />
            <LessonCallout variant="info">
              The reason is regulatory: Indian app store compliance and local digital content rules led Vshow PTE. LTD. to operate under the Vone brand specifically for India. The backend, earnings system, and agency structure are completely shared.
            </LessonCallout>
            <LessonTable
              columns={[
                { header: "Feature", key: "feature" },
                { header: "Poppo Live", key: "poppo" },
                { header: "Vone Live (India)", key: "vone" },
              ]}
              rows={[
                { feature: "Company", poppo: "Vshow PTE. LTD.", vone: "Vshow PTE. LTD." },
                { feature: "Points rate", poppo: "10,000 = $1", vone: "10,000 = $1" },
                { feature: "Gift retention", poppo: "70%", vone: "70%" },
                { feature: "PK battles", poppo: "✅", vone: "✅" },
                { feature: "Party rooms", poppo: "✅", vone: "✅" },
                { feature: "1v1 private match", poppo: "✅", vone: "✅" },
                { feature: "Agency commission tiers", poppo: "4%–20%", vone: "4%–20%" },
                { feature: "Withdrawal methods", poppo: "Epay, USDT, PayPal, bank", vone: "Epay, USDT, PayPal, bank" },
                { feature: "Week 1 task (female)", poppo: "20,000 pts/day", vone: "20,000 pts/day" },
                { feature: "Week 1 task (male)", poppo: "10,000 pts/day", vone: "10,000 pts/day" },
                { feature: "Minimum withdrawal", poppo: "$10 (100,000 pts)", vone: "$10 (100,000 pts)" },
                { feature: "Min internet speed", poppo: "1 Mbps upload", vone: "1 Mbps upload" },
              ]}
            />
          </section>

          {/* Download */}
          <section id="download" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">How to Download</span> Vone Live in India
            </h2>
            <LessonImage
              src="https://play-lh.googleusercontent.com/mEP3rbWpezdLT7EC8EtGb2l5BqGHkZTU2eCR6MHa-pPY6MKb-Cjx8MgxTBmsxoy9lxM=w1080-h1920-rw"
              alt="Vone Live app interface showing party room and live streaming features"
              caption="Download Vone Live directly from the Google Play Store — search Vone Live"
            />
            <LessonCallout variant="danger" label="Security Warning">
              Never download Vone or Poppo from any website or APK link outside the official Play Store. Fake versions exist that steal account credentials and payment information. The official Google Play Store listing is the only safe source.
            </LessonCallout>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p><strong className="text-foreground">On Android (recommended):</strong></p>
              <ol className="list-decimal space-y-3 pl-5">
                <li>Open <strong className="text-foreground">Google Play Store</strong></li>
                <li>Search: <strong className="text-foreground">"Vone Live"</strong></li>
                <li>Look for the app by <strong className="text-foreground">Vshow PTE. LTD.</strong></li>
                <li>Tap <strong className="text-foreground">Install</strong> (~100–160 MB download)</li>
                <li>Open app and begin registration</li>
              </ol>
              <p><strong className="text-foreground">On iPhone:</strong> Search "Vone Live" on the App Store. If unavailable, Android via Google Play is more reliable for Indian users.</p>
            </div>
          </section>

          {/* Account Setup */}
          <section id="account-setup" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Account Setup</span> — Step by Step
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <ol className="list-decimal space-y-3 pl-5">
                <li><strong className="text-foreground">Open Vone Live → tap Sign Up.</strong> Register with mobile number (recommended for India), Google, or Facebook.</li>
                <li><strong className="text-foreground">Enter your details</strong> — name, date of birth, gender. Use real information. Vone verifies identity before allowing withdrawals.</li>
                <li><strong className="text-foreground">Upload a profile photo.</strong> Face must be clearly visible. No group photos, avatars, or heavy filters.</li>
                <li><strong className="text-foreground">Complete Face Authentication.</strong> Live selfie scan — tilt head left, right, and nod. Takes 5 minutes. Approval: 30 minutes to 48 hours.</li>
                <li><strong className="text-foreground">Enter your Inviter ID</strong> if joining via BarbieVerse. This is the most overlooked step. Cannot be added after account creation.</li>
              </ol>
            </div>
            <LessonCallout variant="warning" label="Critical Step">
              If you're joining BarbieVerse, do not skip Step 5. An Inviter ID from BarbieVerse connects you to our agency at signup. It <strong>cannot be added later</strong>. It unlocks your Week 1 earning tasks and agency support immediately.
            </LessonCallout>
          </section>

          {/* Level 5 */}
          <section id="level-5" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Reaching Level 5</span> — Your Earning Gate
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>You cannot go live or earn until you reach <strong className="text-foreground">Level 5</strong>. Most users hit Level 5 in <strong className="text-foreground">1–2 days</strong> spending 30–45 minutes in the app. No money required.</p>
            </div>
            <LessonTable
              columns={[
                { header: "Action", key: "action" },
                { header: "XP Earned", key: "xp" },
                { header: "Free Coins Earned", key: "coins" },
              ]}
              rows={[
                { action: "Watch a stream for 5 minutes", xp: "XP", coins: "40 coins" },
                { action: "Chat in any live room", xp: "XP", coins: "—" },
                { action: "Follow a host", xp: "XP", coins: "—" },
                { action: "Complete new user tasks", xp: "XP", coins: "Varies" },
                { action: "Watch 10 streams in one day", xp: "XP", coins: "400 coins total" },
              ]}
            />
          </section>

          {/* Week 1 */}
          <section id="week-1" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Honest Week 1</span> Earning Numbers for India
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Stream 2 hours per day for 7 consecutive days:</p>
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

          {/* India Opportunity */}
          <section id="india-opportunity" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Why Vone Is a Specific Opportunity</span> for India Right Now
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <div className="rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-md">
                <h3 className="font-display text-lg font-bold text-foreground">1. Low creator competition</h3>
                <p className="mt-1">YouTube India has 100 million+ creators. Vone India has a fraction of that. New hosts get platform discovery faster.</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-md">
                <h3 className="font-display text-lg font-bold text-foreground">2. Earns from Day 1 — no algorithm wait</h3>
                <p className="mt-1">YouTube requires 1,000 subscribers + 4,000 watch hours before monetisation. Vone pays from your first stream via task rewards.</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-md">
                <h3 className="font-display text-lg font-bold text-foreground">3. Hindi works perfectly</h3>
                <p className="mt-1">Vone supports Hindi as an interface language. The Chatting category works in Hindi, regional languages, or Hinglish equally well.</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-md">
                <h3 className="font-display text-lg font-bold text-foreground">4. Works from any city</h3>
                <p className="mt-1">There is no advantage to being in Mumbai or Delhi. A host in Patna with 4G earns identically to a host in any metro city.</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-md">
                <h3 className="font-display text-lg font-bold text-foreground">5. Coin buying via UPI</h3>
                <p className="mt-1">BarbieVerse accepts UPI/Paytm/Google Pay for coin recharges — the same payment system 300 million+ Indians already use daily.</p>
              </div>
            </div>
          </section>

          {/* BarbieVerse */}
          <section id="barbieverse" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Why Join BarbieVerse</span> Instead of Going Solo?
            </h2>
            <LessonTable
              columns={[
                { header: "Feature", key: "feature" },
                { header: "Solo on Vone", key: "solo" },
                { header: "With BarbieVerse", key: "bv" },
              ]}
              rows={[
                { feature: "Inviter ID at signup", solo: "❌ Miss earning bonuses", bv: "✅ Unlocked from Day 1" },
                { feature: "Week 1 task activation", solo: "May not trigger properly", bv: "✅ Confirmed activation" },
                { feature: "PK battle opponents", solo: "Random strangers", bv: "✅ Coordinated BarbieVerse hosts" },
                { feature: "Strategy", solo: "Figure it out alone", bv: "✅ Barbie's Earning Strategies" },
                { feature: "Support language", solo: "English-only official support", bv: "✅ Hindi + English WhatsApp" },
                { feature: "Event alerts", solo: "Miss most of them", bv: "✅ Advance notice" },
                { feature: "Coin recharge", solo: "Pay in-app full price", bv: "✅ 15–20% cheaper via BarbieVerse" },
              ]}
            />
          </section>

          {/* Mistakes */}
          <section id="mistakes" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">4 India-Specific Mistakes</span>
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { myth: "Downloading a fake APK labelled 'Poppo Live'", fix: "Only use Google Play. Search 'Vone Live'. APK downloads = account theft risk." },
                { myth: "Skipping the Inviter ID at signup", fix: "Cannot be added after account is created. If your agency gives you one — enter it during registration." },
                { myth: "Giving up after Week 1", fix: "Week 1 income is task-based and fixed. Real gift income from loyal viewers builds from Week 2 onwards." },
                { myth: "Streaming without a plan", fix: "What time, what category, what you say in the first 60 seconds — all of this affects earnings significantly." },
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
            prev={{ slug: "/academy/coins-points-gifts-explained", title: "Coins, Points & Gifts" }}
            next={{ slug: "/academy/how-to-become-poppo-host", title: "How to Become a Poppo Host" }}
          />

          <div className="mt-8">
            <LessonCTA />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
