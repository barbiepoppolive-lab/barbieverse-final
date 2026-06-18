import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { useState, useEffect, useRef } from "react";
import {
  Smartphone, Camera, Radio, Gift, TrendingUp, CheckCircle2, ChevronDown,
  ChevronRight, Clock, Users, Star, ArrowRight, Zap, Shield, Eye,
  Wifi, Battery, Volume2, UserCheck, Sparkles, AlertCircle, BookOpen,
} from "lucide-react";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://barbieverse.org";
const CANONICAL_URL = `${BASE_URL}/blog/how-to-earn-money-on-poppo-live-india`;

const FAQ_DATA = [
  { q: "Do I need viewers to start streaming on Poppo/Vone Live?", a: "No. Many onboarding campaigns focus on completing streaming tasks rather than reaching a minimum audience size. Beginners can start with zero viewers." },
  { q: "Can I start with zero followers?", a: "Yes. Poppo/Vone Live is designed for new creators. You do not need an existing audience to create an account, complete verification, or go live." },
  { q: "Can college students stream on Poppo/Vone Live?", a: "Yes, provided you meet the platform's minimum age requirement. Many creators stream part-time alongside studies." },
  { q: "Do I need expensive equipment?", a: "No. A modern smartphone, decent lighting, and stable internet are sufficient. Many successful creators use only their phones." },
  { q: "How does gifting work on Poppo/Vone Live?", a: "Viewers purchase coins within the Poppo/Vone app and send virtual gifts to creators during live streams. Creators receive platform credits based on gifts received." },
  { q: "What is face verification on Poppo/Vone Live?", a: "Face verification is a one-time identity check required by Poppo/Vone. You take a clear selfie in good lighting to confirm your identity before going live." },
  { q: "Can I stream from an Android phone?", a: "Yes. Poppo/Vone Live supports both Android and iOS devices. A mid-range smartphone is sufficient." },
  { q: "How long should beginners stream per session?", a: "Start with 1–2 hours per session. Consistency matters more than duration. Stream regularly and improve over time." },
  { q: "Can I work a full-time job and stream on Poppo/Vone?", a: "Yes. Many creators stream part-time in the evenings or on weekends. Poppo/Vone Live is flexible — you choose your own schedule." },
  { q: "Are Poppo/Vone Live rewards guaranteed?", a: "No. All rewards, bonuses, and onboarding promotions are subject to platform eligibility rules and may change at any time. Always verify current terms inside the app." },
  { q: "Is joining Barbieverse required to earn on Poppo/Vone?", a: "No. You can use Poppo/Vone Live independently. Barbieverse provides optional agency support, guidance, and onboarding assistance." },
  { q: "Can Poppo/Vone Live promotions change without notice?", a: "Yes. Platform promotions, bonuses, and eligibility requirements are controlled by Poppo/Vone and may be modified or discontinued at any time." },
  { q: "Can beginners stream using only WiFi?", a: "Yes. WiFi is sufficient for streaming. Ensure your connection is stable with at least 5 Mbps upload speed for smooth streaming." },
  { q: "How do I improve my livestream quality over time?", a: "Focus on consistent scheduling, engaging with viewers, improving audio/video quality, and learning from your analytics. Growth is gradual." },
  { q: "What mistakes should new Poppo/Vone creators avoid?", a: "Inconsistent streaming, ignoring viewers, poor lighting/audio, unrealistic earning expectations, and skipping platform verification steps." },
];

const CHECKLIST_ITEMS = [
  { icon: "💡", label: "Good lighting (natural or ring light)" },
  { icon: "📷", label: "Face verification completed" },
  { icon: "📶", label: "Stable internet connection" },
  { icon: "🔋", label: "Phone fully charged" },
  { icon: "🔇", label: "Quiet room" },
  { icon: "👤", label: "Profile completed with photo" },
  { icon: "🧠", label: "Positive mindset" },
];

export const Route = createFileRoute("/blog/how-to-earn-money-on-poppo-live-india")({
  head: () => ({
    meta: [
      { title: "How to Earn Money on Poppo/Vone Live in India (2026 Beginner Guide) | Barbieverse" },
      { name: "description", content: "Complete beginner guide to earning money on Poppo/Vone Live in India. Learn how to create an account, go live, understand gifts, and start your creator journey in 2026." },
      { name: "keywords", content: "how to earn money on poppo live india, poppo live earning guide, poppo live beginner guide, poppo live india, poppo live rewards, poppo live host, poppo agency india" },
      { property: "og:title", content: "How to Earn Money on Poppo/Vone Live in India (2026 Beginner Guide)" },
      { property: "og:description", content: "Complete beginner guide to earning money on Poppo/Vone Live in India. Step-by-step walkthrough for new creators." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL_URL },
      { property: "article:published_time", content: "2026-06-15T00:00:00Z" },
      { property: "article:modified_time", content: "2026-06-16T00:00:00Z" },
      { property: "article:author", content: "Barbieverse" },
      { property: "article:section", content: "Poppo/Vone Tips" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "How to Earn Money on Poppo/Vone Live in India (2026 Guide)" },
      { name: "twitter:description", content: "Complete beginner guide to earning money on Poppo/Vone Live in India." },
      { name: "robots", content: "index, follow" },
      { rel: "canonical", href: CANONICAL_URL },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to Earn Money on Poppo/Vone Live in India (2026 Beginner Guide)",
          description: "Complete beginner guide to earning money on Poppo/Vone Live in India. Learn how to create an account, go live, understand gifts, and start your creator journey.",
          author: { "@type": "Organization", name: "Barbieverse", url: BASE_URL },
          publisher: { "@type": "Organization", name: "Barbieverse", url: BASE_URL },
          datePublished: "2026-06-15",
          dateModified: "2026-06-16",
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
            { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
            { "@type": "ListItem", position: 3, name: "How to Earn Money on Poppo/Vone Live", item: CANONICAL_URL },
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
  component: HowToEarnBlogPost,
});

export function HowToEarnBlogPost() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false));
  const [activeToc, setActiveToc] = useState("");
  const tocRef = useRef<HTMLDivElement>(null);

  const toggleChecklist = (i: number) => {
    setChecklist((prev) => { const n = [...prev]; n[i] = !n[i]; return n; });
  };

  // Scroll spy for TOC
  useEffect(() => {
    const headings = document.querySelectorAll("h2[id], h3[id]");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveToc(e.target.id); });
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );
    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, []);

  const toc = [
    { id: "what-youll-learn", label: "What You'll Learn" },
    { id: "step-1-create-account", label: "Step 1: Create Account" },
    { id: "step-2-face-verification", label: "Step 2: Face Verification" },
    { id: "step-3-start-streaming", label: "Step 3: Start Streaming" },
    { id: "earning-model", label: "How Earning Works" },
    { id: "realistic-examples", label: "Realistic Examples" },
    { id: "myth-vs-reality", label: "Myth vs Reality" },
    { id: "beginner-checklist", label: "Beginner Checklist" },
    { id: "faq-section", label: "FAQ" },
  ];

  return (
    <SiteLayout>
      {/* JSON-LD is handled in head */}

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0a1e] via-[#0d0d1a] to-[#0a0a14]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[180px]" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[140px]" />
        </div>
        <div className="container relative mx-auto px-4 py-16 sm:py-24 lg:py-32">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/blog" className="hover:text-primary">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Poppo/Vone Live Earning Guide</span>
          </nav>

          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> 8 min read</span>
              <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> Updated for 2026</span>
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> Beginner Friendly</span>
            </div>

            <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              How to Earn Money on{" "}
              <span className="text-gradient-pink">Poppo/Vone Live</span>{" "}
              in India
            </h1>
            <p className="mt-4 font-display text-lg italic text-muted-foreground sm:text-xl">
              The honest, step-by-step beginner guide for 2026
            </p>

            {/* Hook */}
            <div className="mt-8 rounded-2xl border border-border/40 bg-card/30 p-6 backdrop-blur-md sm:p-8">
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Seven days ago you had zero followers. Nobody knew your name. Yet today you understand how creators build audiences, receive virtual gifts, and participate in official onboarding programs. This guide explains exactly how beginners get started on Poppo/Vone Live — without hype or unrealistic promises.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/join" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-pink px-6 text-sm font-bold text-primary-foreground glow-pink ">
                <Rocket /> Get Started
              </Link>
              <a href="#beginner-checklist" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card/40 px-6 text-sm font-semibold backdrop-blur-md hover:border-gold/60">
                <CheckCircle2 className="h-4 w-4" /> Check Eligibility
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          {/* Table of Contents (sticky on desktop) */}
          <div className="mb-12 rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Table of Contents</h2>
            <nav ref={tocRef} className="space-y-1">
              {toc.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    activeToc === t.id ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </div>

          {/* ── What You'll Learn ── */}
          <section id="what-youll-learn" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">What You'll Learn</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { icon: Smartphone, title: "Create your account", desc: "Download, register, and set up your profile the right way" },
                { icon: Radio, title: "Go live confidently", desc: "Understand how livestreaming works and what to expect" },
                { icon: Gift, title: "Understand onboarding rewards", desc: "Learn how platform promotions and tasks work" },
                { icon: TrendingUp, title: "Monetize over time", desc: "Discover how creators earn through virtual gifts" },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-md">
                  <c.icon className="h-8 w-8 text-primary" />
                  <h3 className="mt-3 font-display text-lg font-bold">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Progress Timeline ── */}
          <section className="mb-16">
            <div className="flex flex-col items-start gap-0 sm:flex-row sm:items-center sm:gap-0">
              {[
                { step: "Create Account", icon: Smartphone },
                { step: "Face Verification", icon: Camera },
                { step: "Start Streaming", icon: Radio },
                { step: "Complete Tasks", icon: CheckCircle2 },
                { step: "Explore Rewards", icon: Gift },
              ].map((s, i) => (
                <div key={s.step} className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-pink text-primary-foreground">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold sm:text-center">{s.step}</span>
                  {i < 4 && <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" />}
                </div>
              ))}
            </div>
          </section>

          {/* ── Step 1 ── */}
          <section id="step-1-create-account" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Step 1:</span> Create Your Account
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>Getting started on Poppo/Vone Live takes about 2 minutes. Here's exactly what to do:</p>
              <ol className="list-decimal space-y-3 pl-5">
                <li><strong className="text-foreground">Download the app</strong> — Search "Poppo/Vone Live" on Google Play or the App Store. Install the official app.</li>
                <li><strong className="text-foreground">Create your account</strong> — Sign up with your phone number or email. Choose a memorable username.</li>
                <li><strong className="text-foreground">Use a referral code</strong> — If you were invited by a creator or agency, enter their referral code during signup for potential benefits.</li>
                <li><strong className="text-foreground">Add a profile picture</strong> — Upload a clear, friendly photo. Profiles with photos get more engagement.</li>
                <li><strong className="text-foreground">Complete your bio</strong> — Write a short introduction. Mention your interests or what you plan to stream about.</li>
              </ol>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Pro tip:</strong> Use a real photo — not a stock image. Viewers connect with authentic creators. Avoid anime avatars or group photos for your main profile picture.
                </p>
              </div>
            </div>
          </section>

          {/* ── Step 2 ── */}
          <section id="step-2-face-verification" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Step 2:</span> Face Verification
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>Face verification is a one-time identity check required by Poppo/Vone before you can go live. Here's how to pass it smoothly:</p>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Good verification */}
                <div className="rounded-2xl border border-primary/30 bg-card/40 p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <CheckCircle2 className="h-4 w-4" /> Good Verification
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <li>✅ Well-lit room (face clearly visible)</li>
                    <li>✅ Camera at eye level</li>
                    <li>✅ Clean, plain background</li>
                    <li>✅ Face fully in frame</li>
                    <li>✅ Stable hand or phone stand</li>
                  </ul>
                </div>
                {/* Poor verification */}
                <div className="rounded-2xl border border-destructive/30 bg-card/40 p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-destructive">
                    <AlertCircle className="h-4 w-4" /> Poor Verification
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <li>❌ Dark or backlit room</li>
                    <li>❌ Camera angled from below</li>
                    <li>❌ Cluttered or moving background</li>
                    <li>❌ Face partially hidden</li>
                    <li>❌ Shaky camera</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-gold/20 bg-gold/5 p-4">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Important:</strong> Face verification must match your real appearance. Filters, heavy makeup, or sunglasses may cause rejection. Take your time — you only need to do this once.
                </p>
              </div>
            </div>
          </section>

          {/* ── Step 3 ── */}
          <section id="step-3-start-streaming" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">
              <span className="text-gradient-pink">Step 3:</span> Start Streaming
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Many beginners wrongly believe they need viewers before pressing Go Live. In reality, several publicly discussed onboarding campaigns have focused on completing required streaming tasks and verification rather than reaching a minimum audience size.
              </p>
              <p>When you're ready to go live:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Find a quiet, well-lit space</li>
                <li>Ensure your phone is charged and connected to stable WiFi</li>
                <li>Open Poppo/Vone Live → tap "Go Live"</li>
                <li>Add a title describing what you'll be doing</li>
                <li>Start streaming — even if zero viewers appear initially</li>
                <li>Talk, interact, and be yourself</li>
              </ul>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Remember:</strong> Promotions change, eligibility differs, and users should always verify the latest rules inside Poppo/Vone. What worked last month may be different today.
                </p>
              </div>
            </div>
          </section>

          {/* ── Earning Model ── */}
          <section id="earning-model" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">How Earning Works on Poppo/Vone Live</h2>
            <div className="mt-8 space-y-4">
              {[
                { step: "1", title: "Viewer purchases coins", desc: "Viewers buy virtual coins inside the Poppo/Vone app using real money.", icon: TrendingUp },
                { step: "2", title: "Viewer sends virtual gifts", desc: "During your livestream, viewers send gifts (hearts, roses, diamonds, etc.)", icon: Gift },
                { step: "3", title: "Creator receives credits", desc: "You receive platform points/credits based on the gifts you receive.", icon: Star },
                { step: "4", title: "Withdraw eligible balance", desc: "Eligible balances may be withdrawn according to platform policies and thresholds.", icon: Zap },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-gold/20 bg-gold/5 p-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Disclaimer:</strong> Earning potential varies significantly based on consistency, audience engagement, content quality, and current platform policies. This is not guaranteed income.
              </p>
            </div>
          </section>

          {/* ── Realistic Examples ── */}
          <section id="realistic-examples" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">Realistic Examples</h2>
            <p className="mt-2 text-sm text-muted-foreground">Illustrative scenarios — not promises or guarantees.</p>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {/* Priya */}
              <div className="rounded-2xl border border-primary/20 bg-card/40 p-5 backdrop-blur-md">
                <div className="text-2xl">👩‍🎓</div>
                <h3 className="mt-2 font-display text-lg font-bold">Priya</h3>
                <p className="text-xs text-muted-foreground">22 · College student</p>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p><strong className="text-foreground">Streams:</strong> 2 hours/day after college</p>
                  <p><strong className="text-foreground">Week 1:</strong> Creates account, completes verification, learns livestreaming</p>
                  <p><strong className="text-foreground">Week 2:</strong> Starts getting repeat viewers</p>
                  <p><strong className="text-foreground">Month 2:</strong> Streams regularly and explores monetization</p>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground italic">Illustrative example only.</p>
              </div>

              {/* Rahul */}
              <div className="rounded-2xl border border-gold/20 bg-card/40 p-5 backdrop-blur-md">
                <div className="text-2xl">👨‍💼</div>
                <h3 className="mt-2 font-display text-lg font-bold">Rahul</h3>
                <p className="text-xs text-muted-foreground">26 · Office employee</p>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p><strong className="text-foreground">Streams:</strong> Evenings after work</p>
                  <p><strong className="text-foreground">Setup:</strong> Smartphone + ring light + WiFi</p>
                  <p><strong className="text-foreground">No expensive equipment</strong></p>
                  <p><strong className="text-foreground">Growth:</strong> Builds audience slowly over months</p>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground italic">Illustrative example only.</p>
              </div>

              {/* Beginner */}
              <div className="rounded-2xl border border-accent/20 bg-card/40 p-5 backdrop-blur-md">
                <div className="text-2xl">🌱</div>
                <h3 className="mt-2 font-display text-lg font-bold">Absolute Beginner</h3>
                <p className="text-xs text-muted-foreground">0 followers · 0 experience</p>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p><strong className="text-foreground">First stream viewers:</strong> 0–3</p>
                  <p><strong className="text-foreground">Action:</strong> Completes onboarding tasks</p>
                  <p><strong className="text-foreground">Consistency:</strong> Streams regularly</p>
                  <p><strong className="text-foreground">Result:</strong> May qualify for official promotions if eligible</p>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground italic">Promotions vary and are not guaranteed.</p>
              </div>
            </div>
          </section>

          {/* ── Myth vs Reality ── */}
          <section id="myth-vs-reality" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">Myth vs Reality</h2>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border/40">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">❌ Myth</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">✅ Reality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    ["Need 10,000 followers", "Beginners can start without an audience"],
                    ["Need DSLR camera", "Smartphone is sufficient"],
                    ["Need expensive microphone", "Clear audio from modern phones often works"],
                    ["Must already be famous", "Many creators begin with zero recognition"],
                    ["Guaranteed earnings", "Income depends on eligibility, consistency, and platform policies"],
                  ].map(([myth, reality], i) => (
                    <tr key={i} className="bg-card/30">
                      <td className="px-4 py-3 text-muted-foreground">{myth}</td>
                      <td className="px-4 py-3 font-medium text-primary">{reality}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Beginner Checklist ── */}
          <section id="beginner-checklist" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">Beginner Checklist</h2>
            <p className="mt-2 text-sm text-muted-foreground">Tap each item when ready:</p>
            <div className="mt-6 space-y-2">
              {CHECKLIST_ITEMS.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleChecklist(i)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all ${
                    checklist[i]
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/40 bg-card/30 hover:border-primary/20"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className={checklist[i] ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                  {checklist[i] && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {checklist.filter(Boolean).length}/{CHECKLIST_ITEMS.length} completed
            </div>
          </section>

          {/* ── FAQ ── */}
          <section id="faq-section" className="mb-16 scroll-mt-20">
            <h2 className="font-display text-3xl font-bold">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-3">
              {FAQ_DATA.map((f, i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-md">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold"
                  >
                    {f.q}
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 text-sm text-muted-foreground">{f.a}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Internal Links ── */}
          <section className="mb-16">
            <h2 className="font-display text-2xl font-bold">Continue Reading</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { to: "/blog/poppo-new-host-mission-explained", title: "Poppo/Vone New Host Mission Explained", desc: "Understand how the new host mission works in 2026" },
                { to: "/blog/why-join-barbieverse", title: "Why Join Barbieverse?", desc: "Learn about agency support and onboarding assistance" },
                { to: "/blog/how-much-can-you-earn-on-poppo-live", title: "How Much Can You Earn?", desc: "Realistic earning breakdown for Poppo/Vone Live creators" },
                { to: "/join", title: "Ready to Start?", desc: "Join Barbieverse and begin your creator journey" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md transition-all hover:border-primary/40"
                >
                  <h3 className="font-display font-bold group-hover:text-primary">{link.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{link.desc}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Read more <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Final CTA ── */}
          <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-8 text-center backdrop-blur-md sm:p-12">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to Start Your <span className="text-gradient-pink">Creator Journey</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Join Barbieverse and get beginner-friendly guidance on setup, verification, onboarding, and your first livestream.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/join"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-pink px-8 text-sm font-bold text-primary-foreground glow-pink "
              >
                🚀 Get Started
              </Link>
              <Link
                to="/join"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-border bg-card/40 px-8 text-sm font-semibold backdrop-blur-md hover:border-gold/60"
              >
                📖 Check Eligibility
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Free to join · No hidden fees · Beginner-friendly support
            </p>
          </section>

          {/* ── Trust Disclaimer ── */}
          <div className="mt-12 rounded-xl border border-border/40 bg-card/20 p-5 text-xs text-muted-foreground">
            <p><strong className="text-foreground">Disclaimer:</strong> This article is for educational purposes only. Poppo/Vone Live promotions, bonuses, and earning opportunities are subject to platform eligibility rules and may change without notice. Barbieverse provides agency support and guidance but does not guarantee specific earnings. Users should verify current platform requirements inside the Poppo/Vone app before relying on any promotion. All illustrative examples are hypothetical and not promises of results.</p>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function Rocket() {
  return <span>🚀</span>;
}
