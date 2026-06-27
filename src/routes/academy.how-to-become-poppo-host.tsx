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
const CANONICAL_URL = `${BASE_URL}/academy/how-to-become-poppo-host`;

const FAQ_DATA = [
  { q: "What are the requirements to become a Poppo / Vone host?", a: "You need: (1) Level 5 account, (2) Completed face authentication, (3) A live cover photo with your face clearly visible, and (4) Minimum 1 Mbps upload internet speed. All four are mandatory before you can go live." },
  { q: "How do I complete face authentication?", a: "Go to Profile → Settings → Face Authentication. Take a live selfie and follow the on-screen prompts — tilt your head left, right, and nod. You get 3 attempts per day. If all fail, contact support for manual review." },
  { q: "What category should I choose as a beginner?", a: "Chatting / Talk is the best category for beginners. You don't need to sing, dance, or have any special skill. Just talk, interact with viewers, and build connection. Most top earners started in Chatting." },
  { q: "What are the best hours to stream in India?", a: "Peak hours in IST are 8 PM–12 AM (highest viewer activity), followed by 6 PM–8 PM and 12 AM–2 AM. Weekend afternoons (12 PM–4 PM) also see strong traffic." },
  { q: "What should I say in the first 60 seconds of my stream?", a: "Greet viewers by name, ask where they're watching from, mention you're new and excited, and invite them to follow. The first minute determines whether viewers stay or scroll past." },
  { q: "How much can I earn in Week 1?", a: "Female hosts earn ₹1,162 (20,000 pts/day × 7 days). Male hosts earn ₹581 (10,000 pts/day × 7 days). This is from task rewards alone — gift income is additional." },
  { q: "Can I get banned for something I say on stream?", a: "Yes. Sharing personal contact numbers, asking for off-platform payments, nudity, hate speech, or streaming in restricted categories can result in warnings, temporary suspension, or permanent ban." },
  { q: "Do I need to stream every day?", a: "For Week 1 task rewards, yes — miss one day and the 7-day streak resets to Day 1. After Week 1, daily streaming is recommended but not mandatory. Consistency builds loyal viewers and higher earnings." },
];

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "4 Requirements" },
  { id: "level-5", label: "Level 5" },
  { id: "face-auth", label: "Face Authentication" },
  { id: "cover-photo", label: "Cover Photo" },
  { id: "internet", label: "Internet Speed" },
  { id: "go-live", label: "Go Live" },
  { id: "title-formula", label: "Title Formula" },
  { id: "category", label: "Category" },
  { id: "peak-hours", label: "Peak Hours" },
  { id: "week-1", label: "Week 1 Earnings" },
  { id: "first-60-seconds", label: "First 60 Seconds" },
  { id: "banned", label: "Banned Actions" },
  { id: "faq-section", label: "FAQ" },
];

export const Route = createFileRoute("/academy/how-to-become-poppo-host")({
  head: () => ({
    meta: [
      { title: "How to Become a Poppo / Vone Host in India — Complete Setup Guide (2025) | Barbieverse" },
      { name: "description", content: "Exact steps to go from zero to your first live stream on Vone in India — face authentication tips, what category to choose, when to stream, what to say, and the real Week 1 earnings breakdown." },
      { name: "keywords", content: "how to become poppo live host, vone live host kaise bane, poppo live streaming kaise kare" },
      { property: "og:title", content: "How to Become a Poppo / Vone Host in India — Complete Setup Guide (2025)" },
      { property: "og:description", content: "Exact steps to go from zero to your first live stream on Vone in India — face auth, category, timing, and Week 1 earnings." },
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
          headline: "How to Become a Poppo / Vone Host in India — Complete Setup Guide (2025)",
          description: "Exact steps to go from zero to your first live stream on Vone in India — face authentication tips, what category to choose, when to stream, what to say, and the real Week 1 earnings breakdown.",
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
            { "@type": "ListItem", position: 3, name: "How to Become a Poppo / Vone Host", item: CANONICAL_URL },
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
  component: HowToBecomePoppoHost,
});

function HowToBecomePoppoHost() {
  return (
    <SiteLayout>
      <LessonHero
        lessonNumber={4}
        title="How to Become a Poppo / Vone Host"
        subtitle="Exact Steps From Zero to First Live Stream"
        readTime="12 min read"
        difficulty="Beginner Friendly"
      />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <LessonTOC items={TOC} />

          {/* Overview */}
          <section id="overview" className="mb-16 scroll-mt-20">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 backdrop-blur-md sm:p-8">
              <p className="font-display text-lg font-medium italic text-foreground sm:text-xl">
                "You've downloaded Vone. You understand coins and points. Now it's time to actually go live and start earning."
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                This lesson walks you through every step — from hitting Level 5 to your first 60 seconds on screen. No shortcuts, no guesswork. Just the exact sequence that works.
              </p>
            </div>
          </section>

          {/* 4 Requirements */}
          <section id="requirements" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">4 Requirements</span> Before You Can Go Live
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Vone does not let you stream until all four are completed. Most hosts finish them in <strong className="text-foreground">1–2 days</strong>.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Requirement", key: "req" },
                { header: "What It Is", key: "what" },
                { header: "Time to Complete", key: "time" },
              ]}
              rows={[
                { req: "Level 5", what: "Reach account Level 5 through XP actions", time: "1–2 days" },
                { req: "Face Authentication", what: "Live selfie scan — tilt head left, right, nod", time: "5 min (approval: 30 min–48 hrs)" },
                { req: "Cover Photo", what: "Upload a photo of your face for your live room thumbnail", time: "2 min" },
                { req: "Internet Speed", what: "Minimum 1 Mbps upload speed confirmed", time: "Tested instantly" },
              ]}
            />
            <LessonCallout variant="tip" label="Fastest Path">
              Complete all four on Day 1. Most new hosts who do this go live on Day 2. Hosts who skip one requirement often take a week to come back and finish.
            </LessonCallout>
          </section>

          {/* Level 5 */}
          <section id="level-5" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Level 5</span> — Your Earning Gate
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                You <strong className="text-foreground">cannot go live or earn</strong> until you reach Level 5. This is a platform rule — no exceptions.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Action", key: "action" },
                { header: "XP Earned", key: "xp" },
                { header: "Bonus", key: "bonus" },
              ]}
              rows={[
                { action: "Watch a stream for 5 minutes", xp: "XP", bonus: "40 free coins" },
                { action: "Chat in any live room", xp: "XP", bonus: "—" },
                { action: "Follow a host", xp: "XP", bonus: "—" },
                { action: "Complete new user tasks", xp: "XP", bonus: "Varies" },
                { action: "Watch 10 streams in one day", xp: "XP", bonus: "400 coins total" },
                { action: "Send a gift (any amount)", xp: "XP", bonus: "—" },
                { action: "Login daily", xp: "XP", bonus: "Streak bonus" },
              ]}
            />
            <LessonCallout variant="info">
              <strong className="text-foreground">Male hosts:</strong> Your Wealth Level must reach 10 before you can access certain earning features. This is separate from your account Level 5 requirement. You reach Wealth Level 10 by receiving gifts from viewers.
            </LessonCallout>
          </section>

          {/* Face Auth */}
          <section id="face-auth" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Face Authentication</span> — The Step That Blocks Most People
            </h2>
            <LessonImage
              src="https://play-lh.googleusercontent.com/lT0Z1Wd_p80_AwbBpcpvynij9SBMgK_SATVPrG9vag8egC1n-fEui-bmX1JK2eHCbg=w526-h296-rw"
              alt="Poppo Live face authentication verification screen"
              caption="Face authentication — tilt head left, right, and nod as prompted"
            />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Face authentication is a <strong className="text-foreground">live selfie scan</strong> that verifies you are a real person. It is required for every host and cannot be skipped.
              </p>
            </div>
            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/30 p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-pink text-[11px] font-semibold text-primary-foreground">1</span>
                <span>Go to <strong className="text-foreground">Profile → Settings → Face Authentication</strong></span>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/30 p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-pink text-[11px] font-semibold text-primary-foreground">2</span>
                <span>Take a <strong className="text-foreground">live selfie</strong> — no photos, no filters, no screenshots</span>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/30 p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-pink text-[11px] font-semibold text-primary-foreground">3</span>
                <span>Follow on-screen prompts: <strong className="text-foreground">tilt head left, tilt right, nod</strong></span>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/30 p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-pink text-[11px] font-semibold text-primary-foreground">4</span>
                <span>Wait for approval: <strong className="text-foreground">30 minutes to 48 hours</strong></span>
              </div>
            </div>

            <h3 className="mt-8 font-display text-xl font-bold">
              <span className="text-gradient-pink">Common Failures</span> and How to Fix Them
            </h3>
            <LessonTable
              columns={[
                { header: "Failure Reason", key: "reason" },
                { header: "Fix", key: "fix" },
              ]}
              rows={[
                { reason: "Poor lighting", fix: "Face a window or ring light. No backlighting." },
                { reason: "Filters or beauty mode", fix: "Turn off all filters. Vone detects them." },
                { reason: "Head movement too fast", fix: "Move slowly and deliberately. Follow the on-screen speed." },
                { reason: "Face partially covered", fix: "Remove glasses, masks, hair covering forehead." },
                { reason: "Screenshot instead of live selfie", fix: "Must be live camera — app detects static images." },
                { reason: "Different person from profile photo", fix: "The selfie must match your uploaded profile photo." },
              ]}
            />
            <LessonCallout variant="danger" label="3 Attempts Per Day">
              You get <strong>3 face authentication attempts per day</strong>. If all three fail, you must wait 24 hours before trying again. Use your attempts wisely — fix lighting and settings before retrying.
            </LessonCallout>
            <LessonCallout variant="info">
              If all attempts fail repeatedly, contact Vone support for <strong className="text-foreground">manual review</strong>. Submit a ticket through the app with your user ID and a clear selfie. Manual review takes 2–5 business days.
            </LessonCallout>
          </section>

          {/* Cover Photo */}
          <section id="cover-photo" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Cover Photo</span> — Your First Impression
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Your cover photo appears as the <strong className="text-foreground">thumbnail</strong> of your live room. Viewers decide in under 2 seconds whether to tap in based on this image.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "What Works", key: "works" },
                { header: "What Gets Rejected", key: "rejected" },
              ]}
              rows={[
                { works: "Clear face, well-lit, smiling", rejected: "Face not visible (back turned, covered)" },
                { works: "Simple background, clean frame", rejected: "Group photos with multiple people" },
                { works: "Natural look, minimal makeup OK", rejected: "Heavy filters or AI-altered faces" },
                { works: "Phone camera selfie (front-facing)", rejected: "Professional studio shots (looks fake)" },
                { works: "High resolution, portrait orientation", rejected: "Blurry, cropped, or pixelated images" },
                { works: "Same person as face auth selfie", rejected: "Different person from authentication" },
              ]}
            />
            <LessonCallout variant="tip" label="Quick Formula">
              Stand near a window. Smile naturally. Take a front-facing selfie. Upload it as your cover photo. Done in 2 minutes.
            </LessonCallout>
          </section>

          {/* Internet Speed */}
          <section id="internet" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Internet Speed</span> — The Minimum You Need
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Slow internet causes <strong className="text-foreground">lag, frozen frames, and dropped streams</strong>. Test your upload speed before going live.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Upload Speed", key: "speed" },
                { header: "Result", key: "result" },
              ]}
              rows={[
                { speed: "Below 1 Mbps", result: "❌ Stream will not start or keeps freezing" },
                { speed: "1–2 Mbps", result: "⚠️ Works but may lag during peak hours" },
                { speed: "3–5 Mbps", result: "✅ Smooth streaming, recommended minimum" },
                { speed: "5–10 Mbps", result: "✅ Excellent — supports HD quality and PK battles" },
                { speed: "10 Mbps+", result: "✅ Perfect — no limits on any feature" },
              ]}
            />
            <LessonCallout variant="info">
              Test your speed at <strong className="text-foreground">speedtest.net</strong> on your phone. Focus on the <strong>upload</strong> number — not download. 4G in most Indian cities provides 3–8 Mbps upload, which is sufficient.
            </LessonCallout>
          </section>

          {/* Go Live */}
          <section id="go-live" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Go Live</span> — Exact Tap Sequence
            </h2>
            <LessonImage
              src="https://play-lh.googleusercontent.com/sGVud3ieTNJNnYiAYAAQankA3tC_kkemsBOK2grKWBw7_QP2DZGPrxrim-IWuknBEw=w526-h296-rw"
              alt="Poppo Live go live button and stream setup screen"
              caption="Tap the camera button and set your stream title before going live"
            />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Once all four requirements are complete, here is exactly what to tap:
              </p>
            </div>
            <div className="mt-6 rounded-2xl border border-border/40 bg-card/30 p-6 font-mono text-sm text-muted-foreground backdrop-blur-md">
              <p className="mb-2 text-foreground">Step-by-step:</p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Open Vone Live app</li>
                <li>Tap the <strong className="text-primary">center "+" button</strong> at the bottom</li>
                <li>Select <strong className="text-primary">"Go Live"</strong></li>
                <li>Choose your <strong className="text-primary">category</strong> (start with Chatting)</li>
                <li>Enter your <strong className="text-primary">live room title</strong></li>
                <li>Set visibility to <strong className="text-primary">"Public"</strong></li>
                <li>Tap <strong className="text-primary">"Start Live"</strong></li>
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                Your live room is now active. Viewers will start appearing within seconds if you have a good title and cover photo.
              </p>
            </div>
            <LessonCallout variant="warning" label="Before You Tap Start">
              Make sure your phone is plugged in (streaming drains battery fast), you're in a quiet room, and your face is well-lit. You cannot change your cover photo once live starts.
            </LessonCallout>
          </section>

          {/* Title Formula */}
          <section id="title-formula" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Title Formula</span> — What to Write
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Your title determines whether viewers tap into your room. A weak title means fewer viewers, even if your stream is great.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Weak Title", key: "weak" },
                { header: "Strong Title", key: "strong" },
              ]}
              rows={[
                { weak: '"Live"', strong: '"First stream! Come say hi 🎉"' },
                { weak: '"Hey guys"', strong: '"New host from Delhi — let\'s talk! 💬"' },
                { weak: '"Streaming"', strong: '"Late night chat — where are you from? 🌙"' },
                { weak: '"Testing"', strong: '"Day 1 on Vone! Send me a rose 🌹"' },
                { weak: '"Hello"', strong: '"Hindi mein baat karte hain! 🇮🇳"' },
              ]}
            />
            <LessonCallout variant="tip" label="Title Formula That Works">
              <strong className="text-foreground">[Status] + [Hook] + [Call to Action]</strong><br />
              Examples: "New host! Come say hi 🎉" · "Late night chat — where are you from? 🌙" · "Day 1! Send me a rose 🌹"
            </LessonCallout>
          </section>

          {/* Category */}
          <section id="category" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Category</span> — Where to Position Yourself
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                The category you choose determines which viewers find your stream. Choose wrong and you'll be invisible to your target audience.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Category", key: "cat" },
                { header: "Best For", key: "best" },
                { header: "Beginner Friendly?", key: "beginner" },
              ]}
              rows={[
                { cat: "Chatting / Talk", best: "Conversation, interaction, building connection", beginner: "✅ Best for beginners" },
                { cat: "Singing", best: "Karaoke, vocal performance", beginner: "⚠️ Needs some singing ability" },
                { cat: "Dancing", best: "Dance performance, choreography", beginner: "⚠️ Needs space and skill" },
                { cat: "Gaming", best: "Live gameplay, commentary", beginner: "⚠️ Needs gaming setup" },
                { cat: "Cooking", best: "Recipe demos, food chat", beginner: "⚠️ Needs kitchen setup" },
                { cat: "Beauty / Fashion", best: "Makeup, styling tips", beginner: "⚠️ Needs products and lighting" },
              ]}
            />
            <LessonCallout variant="tip" label="Beginner Recommendation">
              Start with <strong className="text-foreground">Chatting / Talk</strong>. You don't need any special skill — just talk, interact with viewers, and build connection. Most top earners started here. You can switch categories later once you find your niche.
            </LessonCallout>
          </section>

          {/* Peak Hours */}
          <section id="peak-hours" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Peak Hours</span> — When to Stream in India
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Streaming at the right time can <strong className="text-foreground">double or triple</strong> your viewer count. The algorithm pushes new streams harder during peak hours.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Time (IST)", key: "time" },
                { header: "Viewer Activity", key: "activity" },
                { header: "Algorithm Push", key: "push" },
              ]}
              rows={[
                { time: "6 AM – 12 PM", activity: "Low", push: "⭐" },
                { time: "12 PM – 4 PM", activity: "Moderate (weekends higher)", push: "⭐⭐" },
                { time: "4 PM – 8 PM", activity: "Building", push: "⭐⭐" },
                { time: "8 PM – 12 AM", activity: "Peak — highest viewer count", push: "⭐⭐⭐⭐⭐" },
                { time: "12 AM – 2 AM", activity: "Strong — night owls active", push: "⭐⭐⭐⭐" },
                { time: "2 AM – 6 AM", activity: "Very low", push: "⭐" },
              ]}
            />
            <LessonCallout variant="info">
              <strong className="text-foreground">Best slot for new hosts:</strong> 8 PM – 11 PM IST. The algorithm gives extra visibility to new streams during peak hours. Weekend afternoons (12 PM – 4 PM) are the second-best window.
            </LessonCallout>
          </section>

          {/* Week 1 Earnings */}
          <section id="week-1" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Week 1 Earnings</span> — The Real Numbers
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                These are <strong className="text-foreground">task reward earnings only</strong> — gift income from viewers is additional. Stream 2 hours per day for 7 consecutive days.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Day", key: "day" },
                { header: "Female (pts)", key: "female" },
                { header: "Male (pts)", key: "male" },
              ]}
              rows={[
                { day: "Day 1", female: "20,000", male: "10,000" },
                { day: "Day 2", female: "20,000", male: "10,000" },
                { day: "Day 3", female: "20,000", male: "10,000" },
                { day: "Day 4", female: "20,000", male: "10,000" },
                { day: "Day 5", female: "20,000", male: "10,000" },
                { day: "Day 6", female: "20,000", male: "10,000" },
                { day: "Day 7", female: "20,000", male: "10,000" },
                { day: "TOTAL", female: "1,40,000 pts = ₹1,162", male: "70,000 pts = ₹581" },
              ]}
            />
            <LessonCallout variant="danger" label="Streak Warning">
              Miss <strong>even one day</strong> of the 7-day streak and it <strong>resets to Day 1</strong>. The streak does not pause, carry forward, or get extended. Day 4 of 7? Miss tomorrow = back to Day 1. Plan your streaming schedule before you start.
            </LessonCallout>
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Reminder:</strong> 10,000 Points = $1 USD ≈ ₹83. The conversion rate is fixed and never changes. Gift income from viewers is on top of these task rewards.
              </p>
            </div>
          </section>

          {/* First 60 Seconds */}
          <section id="first-60-seconds" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">First 60 Seconds</span> — Your Script Template
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                The first minute of your stream determines whether viewers stay or scroll past. Here is a proven script template:
              </p>
            </div>
            <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-6 backdrop-blur-md sm:p-8">
              <p className="font-display text-sm font-medium text-foreground sm:text-base">
                <strong className="text-primary">0–10 seconds:</strong> "Hey everyone! Welcome to my stream! I'm [name] and this is my first day on Vone!"<br /><br />
                <strong className="text-primary">10–25 seconds:</strong> "Where are you watching from? Drop your city in the chat! I'm from [your city]."<br /><br />
                <strong className="text-primary">25–40 seconds:</strong> "If you're new here, follow me so you don't miss my next stream. I'll be going live every day!"<br /><br />
                <strong className="text-primary">40–60 seconds:</strong> "Send me a rose if you're enjoying the stream! Let's see who's the first one 🌹"
              </p>
            </div>
            <LessonCallout variant="tip" label="Why This Works">
              This script does three things: <strong className="text-foreground">greet</strong> (makes viewers feel welcome), <strong className="text-foreground">engage</strong> (asks a question so they type in chat), and <strong className="text-foreground">convert</strong> (asks for a follow and a gift). Every successful host does some version of this in their first minute.
            </LessonCallout>
          </section>

          {/* Banned Actions */}
          <section id="banned" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Banned Actions</span> — What Gets You Suspended
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Vone's moderation is automated and strict. Many new hosts get suspended for things they didn't know were against the rules.
              </p>
            </div>
            <LessonTable
              columns={[
                { header: "Action", key: "action" },
                { header: "Consequence", key: "consequence" },
              ]}
              rows={[
                { action: "Sharing personal phone number or WhatsApp", consequence: "Warning → Suspension" },
                { action: "Asking viewers to pay off-platform", consequence: "Immediate suspension" },
                { action: "Nudity or sexually suggestive content", consequence: "Permanent ban" },
                { action: "Hate speech or political extremism", consequence: "Permanent ban" },
                { action: "Using multiple accounts", consequence: "Permanent ban on all accounts" },
                { action: "Streaming in wrong category", consequence: "Warning → demotion" },
                { action: "Bot-like behaviour (spamming chat)", consequence: "Temporary suspension" },
                { action: "Promoting other apps on stream", consequence: "Immediate suspension" },
                { action: "Minors appearing on stream", consequence: "Permanent ban" },
                { action: "Violence or self-harm content", consequence: "Permanent ban + report" },
              ]}
            />
            <LessonCallout variant="danger" label="Zero Tolerance">
              Permanent bans are <strong>not appealable</strong>. One violation in the permanent ban category = your account, your earnings, and your face authentication are all gone. Never risk it.
            </LessonCallout>
          </section>

          {/* FAQ */}
          <section id="faq-section" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">Frequently Asked Questions</h2>
            <div className="mt-6">
              <LessonFAQ items={FAQ_DATA} />
            </div>
          </section>

          <LessonNav
            prev={{ slug: "/academy/vone-app-india", title: "Vone App India Guide" }}
            next={{ slug: "/academy/poppo-live-earning-india", title: "How Much Can You Earn" }}
          />

          <div className="mt-8">
            <LessonCTA />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
