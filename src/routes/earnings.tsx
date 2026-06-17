import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Reveal } from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  TrendingUp,
  Users,
  Clock,
  Zap,
  Crown,
  BarChart3,
  X,
} from "lucide-react";

export const Route = createFileRoute("/earnings")({
  head: () => ({
    meta: [
      { title: "Understand Creator Earnings — Barbieverse" },
      { name: "description", content: "Explore illustrative creator journeys showing how consistency, audience engagement, platform tasks, and virtual gifts may contribute to earnings over time." },
      { property: "og:title", content: "Understand Creator Earnings — Barbieverse" },
      { property: "og:description", content: "Three example creator journeys showing how consistency and engagement may contribute to earnings over time." },
      { name: "robots", content: "index, follow" },
    ],
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://barbieverse.org/" },
          { "@type": "ListItem", position: 2, name: "Earnings Guide", item: "https://barbieverse.org/earnings" },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Understand Creator Earnings",
        description: "Explore illustrative creator journeys showing how consistency, audience engagement, platform tasks, and virtual gifts may contribute to earnings over time.",
        url: "https://barbieverse.org/earnings",
        publisher: { "@type": "Organization", name: "Barbieverse" },
      },
    ],
  }),
  component: EarningsPage,
});

type CreatorCard = {
  id: string;
  name: string;
  age: number;
  role: string;
  hoursPerDay: string;
  focus: string[];
  tools: string[];
  badge: string;
  badgeIcon: string;
  badgeColor: string;
  annualRange: string;
  meterLabel: string;
  meterColor: string;
  months: {
    label: string;
    items: string[];
  }[];
};

const CREATORS: CreatorCard[] = [
  {
    id: "aisha",
    name: "Aisha",
    age: 20,
    role: "Student",
    hoursPerDay: "2",
    focus: ["Learning", "Completing onboarding", "Building confidence"],
    tools: ["Android phone", "WiFi", "Ring light"],
    badge: "Beginner Journey",
    badgeIcon: "🌱",
    badgeColor: "text-emerald-400",
    annualRange: "US$600 – US$1,200",
    meterLabel: "Beginner Journey",
    meterColor: "from-emerald-500/80 to-emerald-400/60",
    months: [
      { label: "Month 1", items: ["Learns platform", "Completes onboarding tasks", "Small audience"] },
      { label: "Months 2–3", items: ["Streams consistently", "Gains repeat viewers", "Receives occasional gifts"] },
      { label: "Months 4–12", items: ["Maintains regular activity", "Continues gradual growth"] },
    ],
  },
  {
    id: "rahul",
    name: "Rahul",
    age: 28,
    role: "Office employee",
    hoursPerDay: "3–4",
    focus: ["Daily streaming", "Viewer interaction", "Regular schedule"],
    tools: ["Smartphone", "Stable WiFi", "Good lighting"],
    badge: "Growing Creator",
    badgeIcon: "🚀",
    badgeColor: "text-sky-400",
    annualRange: "US$1,500 – US$3,500",
    meterLabel: "Growing Creator",
    meterColor: "from-sky-500/80 to-sky-400/60",
    months: [
      { label: "Month 1", items: ["Onboarding complete"] },
      { label: "Months 2–6", items: ["Audience grows steadily", "Regular gifting begins"] },
      { label: "Months 7–12", items: ["Benefits from consistency", "Participates in platform activities"] },
    ],
  },
  {
    id: "meera",
    name: "Meera",
    age: 24,
    role: "Full-time streamer",
    hoursPerDay: "4–6",
    focus: ["Daily consistency", "Strong audience engagement", "Platform participation", "Community building"],
    tools: ["Smartphone", "Stable WiFi", "Professional lighting"],
    badge: "Advanced Growth Path",
    badgeIcon: "👑",
    badgeColor: "text-amber-400",
    annualRange: "US$4,000 – US$8,000+",
    meterLabel: "Advanced Growth Path",
    meterColor: "from-amber-500/80 to-amber-400/60",
    months: [
      { label: "Months 1–3", items: ["Completes onboarding", "Develops streaming habits"] },
      { label: "Months 4–6", items: ["Builds loyal returning viewers"] },
      { label: "Months 7–12", items: ["May reach higher task tiers", "Viewer gifting becomes increasingly important"] },
    ],
  },
];

const BREAKDOWN_ITEMS = [
  { label: "Platform onboarding tasks", icon: "🎯", color: "bg-sky-500" },
  { label: "Platform activities", icon: "📋", color: "bg-violet-500" },
  { label: "Viewer virtual gifts", icon: "🎁", color: "bg-pink-500" },
  { label: "Consistency over time", icon: "⏱️", color: "bg-amber-500" },
];

function CreatorModal({ card, onClose }: { card: CreatorCard; onClose: () => void }) {
  const { t } = useLang();
  const progressValues = [20, 45, 70, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-background/95 via-card/95 to-background/95 p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <span className={`text-2xl ${card.badgeColor}`}>{card.badgeIcon}</span>
            <div>
              <h3 className="font-display text-2xl font-medium">{card.name}, {card.age}</h3>
              <p className="text-sm text-muted-foreground">{card.role} · {card.hoursPerDay} hrs/day</p>
            </div>
          </div>
          <div className={`mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium ${card.badgeColor}`}>
            {card.badge}
          </div>
        </div>

        <div className="mb-6">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">Focus Areas</h4>
          <div className="flex flex-wrap gap-2">
            {card.focus.map((f) => (
              <span key={f} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-muted-foreground">{f}</span>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold">Monthly Progress</h4>
          <div className="space-y-4">
            {card.months.map((m, i) => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{progressValues[i]}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${card.meterColor} transition-all duration-1000`}
                    style={{ width: `${progressValues[i]}%` }}
                  />
                </div>
                <ul className="mt-2 space-y-1">
                  {m.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-gold/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-gold">Illustrative Annual Range</div>
          <div className="mt-1 font-display text-xl font-bold text-gradient-pink">{card.annualRange}</div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
          These are illustrative examples only. Actual results vary.
        </p>
      </div>
    </div>
  );
}

function EarningsPage() {
  const { t, lang } = useLang();
  const hi = lang === "hi";
  const [selectedCard, setSelectedCard] = useState<CreatorCard | null>(null);

  const creators = CREATORS;

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[150px]" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-accent/6 blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 pt-16 pb-14 sm:pt-24 sm:pb-20">
          <Reveal variant="fade-up">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="font-display text-4xl font-medium sm:text-5xl lg:text-6xl">
                {hi ? "क्रिएटर कमाई को" : "Understand Creator"}{" "}
                <span className="italic text-gradient-pink">{hi ? "समझें" : "Earnings"}</span>
              </h1>
              <p className="mt-5 max-w-xl mx-auto text-sm leading-relaxed text-muted-foreground sm:text-base">
                {hi
                  ? "तीन उदाहरण क्रिएटर जर्नी देखें जो दिखाती हैं कि कैसे निरंतरता, ऑडियंस एंगेजमेंट, प्लेटफ़ॉर्म टास्क और वर्चुअल गिफ्ट्स समय के साथ कमाई में योगदान दे सकते हैं।"
                  : "Explore three example creator journeys showing how consistency, audience engagement, platform tasks, and virtual gifts may contribute to earnings over time."}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {[
                  { icon: "📊", label: hi ? "शैक्षिक उदाहरण" : "Educational Examples" },
                  { icon: "🕒", label: hi ? "2026 के लिए अपडेटेड" : "Updated for 2026" },
                  { icon: "🌸", label: hi ? "बिगिनर फ्रेंडली" : "Beginner Friendly" },
                ].map((b) => (
                  <span key={b.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md">
                    {b.icon} {b.label}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="#scenarios"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-pink px-6 text-sm font-semibold text-primary-foreground glow-pink transition-all hover:scale-[1.02]"
                >
                  {hi ? "सेनारियो देखें" : "Explore Scenarios"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <Link
                  to="/join"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card/40 px-6 text-sm font-semibold backdrop-blur-md transition-all hover:border-gold/60 hover:bg-card/70"
                >
                  <GraduationCap className="h-4 w-4" />
                  {hi ? "स्ट्रीमिंग के बारे में जानें" : "Learn About Streaming"}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="container mx-auto px-4"><div className="divider-glow" /></div>

      {/* Creator Carousel */}
      <section id="scenarios" className="container mx-auto px-4 py-14 sm:py-20">
        <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{hi ? "क्रिएटर जर्नी" : "Creator Journeys"}</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            {hi ? "तीन उदाहरण" : "Three Example"} <span className="italic text-gradient-pink">{hi ? "क्रिएटर" : "Creators"}</span>
          </h2>
        </Reveal>

        <Reveal variant="fade-up" delay={120}>
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
            {creators.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 text-left backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:scale-[1.02] hover:bg-white/[0.06]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-xl font-medium">{card.name}, {card.age}</h3>
                    <p className="text-xs text-muted-foreground">{card.role}</p>
                  </div>
                  <span className={`text-2xl ${card.badgeColor}`}>{card.badgeIcon}</span>
                </div>

                <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {card.hoursPerDay} {hi ? "घंटे/दिन" : "hrs/day"}
                </div>

                <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium ${card.badgeColor}`}>
                  {card.badge}
                </div>

                <div className="mb-4">
                  <div className="h-1.5 w-full rounded-full bg-white/10">
                    <div className={`h-full rounded-full bg-gradient-to-r ${card.meterColor}`} style={{ width: "100%" }} />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gold">{hi ? "उदाहरण वार्षिक रेंज" : "Illustrative Annual Range"}</div>
                  <div className="mt-1 font-display text-lg font-bold text-gradient-pink">{card.annualRange}</div>
                </div>

                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary group-hover:text-primary/80 transition-colors">
                  {hi ? "विस्तार देखें" : "View Details"}
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Earnings Breakdown */}
      <section className="relative border-y border-border/40 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-noir opacity-80" />
        <div className="container mx-auto px-4 py-14 sm:py-20">
          <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
            <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{hi ? "कमाई का घटक" : "Earnings Breakdown"}</div>
            <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
              {hi ? "क्रिएटर कमाई के" : "Factors That"} <span className="italic text-gradient-pink">{hi ? "तत्व" : "Contribute"}</span>
            </h2>
          </Reveal>

          <Reveal variant="fade-up" delay={120}>
            <div className="mx-auto max-w-3xl">
              <div className="grid gap-4 sm:grid-cols-2">
                {BREAKDOWN_ITEMS.map((item, i) => (
                  <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="mt-1 h-1 w-24 rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${item.color} transition-all duration-1000`} style={{ width: `${(i + 1) * 25}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center text-xs text-muted-foreground/60">
                {hi ? "वास्तविक क्रिएटर कमाई" : "Illustrative creator earnings"} · {hi ? "गारंटी नहीं" : "Not guaranteed"}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="container mx-auto px-4 py-14 sm:py-20">
        <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{hi ? "तुलना" : "Comparison"}</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            {hi ? "तीन उदाहरण" : "Three Examples"} <span className="italic text-gradient-pink">{hi ? "देखें" : "Side by Side"}</span>
          </h2>
        </Reveal>

        <Reveal variant="fade-up" delay={120}>
          <div className="mx-auto max-w-4xl overflow-x-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5 mb-6 mx-auto">
              <BarChart3 className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-semibold text-gold">{hi ? "केवल उदाहरण" : "Illustrative Examples Only"}</span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-gold">{hi ? "प्रोफ़ाइल" : "Profile"}</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-gold">{hi ? "घंटे/दिन" : "Hours/Day"}</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-gold">{hi ? "निरंतरता" : "Consistency"}</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-gold">{hi ? "उदाहरण वार्षिक रेंज" : "Example Annual Range"}</th>
                </tr>
              </thead>
              <tbody>
                {creators.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${c.badgeColor}`}>{c.badgeIcon}</span>
                        <div>
                          <div className="text-sm font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">{c.hoursPerDay}</td>
                    <td className="py-4 text-sm text-muted-foreground">{c.badge}</td>
                    <td className="py-4 font-display text-sm font-bold text-gradient-pink">{c.annualRange}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-gradient-noir">
        <div className="container mx-auto px-4 py-14 text-center sm:py-20">
          <Reveal variant="fade-up">
            <h2 className="font-display text-3xl font-medium sm:text-4xl">
              {hi ? "अपनी क्रिएटर जर्नी" : "Ready to Begin Your Creator"} <span className="italic text-gradient-pink">{hi ? "शुरू करने के लिए तैयार?" : "Journey?"}</span>
            </h2>
            <p className="mt-3 max-w-lg mx-auto text-sm text-muted-foreground">
              {hi
                ? "सेटअप, वेरिफ़िकेशन, ऑनबोर्डिंग और लाइवस्ट्रीमिंग बेस्ट प्रैक्टिस के बारे में शैक्षिक गाइडेंस पाने के लिए Barbieverse से जुड़ें।"
                : "Join Barbieverse to receive educational guidance on setup, verification, onboarding, and livestream best practices."}
            </p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/join"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-pink px-8 text-sm font-semibold tracking-wide text-primary-foreground glow-pink transition-all hover:scale-[1.02]"
              >
                <Zap className="h-4 w-4" />
                {hi ? "जर्नी शुरू करें" : "Start My Journey"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/blog"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-border bg-card/40 px-8 text-sm font-semibold backdrop-blur-md transition-all hover:border-gold/60 hover:bg-card/70"
              >
                <BookOpen className="h-4 w-4" />
                {hi ? "बिगिनर गाइड पढ़ें" : "Read Beginner Guides"}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Legal Footer */}
      <div className="container mx-auto px-4 py-6 text-center">
        <Link to="/terms-and-conditions" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline underline-offset-2">
          {hi ? "कानूनी शर्तें और कमाई अस्वीकरण देखें →" : "See Legal Terms & Earnings Disclaimer →"}
        </Link>
      </div>

      {/* Creator Modal */}
      {selectedCard && <CreatorModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </SiteLayout>
  );
}
