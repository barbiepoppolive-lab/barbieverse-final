import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { getPublicSettings } from "@/lib/api/settings.functions";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useState } from "react";
import {
  BadgeCheck,
  Copy,
  CheckCircle2,
  MessageCircle,
  Smartphone,
  Settings,
  UserPlus,
  ArrowRight,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

const settingsQO = queryOptions({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join Barbieverse — Start Earning on Poppo Live | Barbieverse" },
      {
        name: "description",
        content:
          "Join India's top Poppo creator agency in 4 simple steps. Copy our Agency ID, paste in Poppo app, and start earning.",
      },
      { property: "og:title", content: "Join Barbieverse — Start Earning on Poppo Live" },
      {
        property: "og:description",
        content: "Join India's top Poppo creator agency in 4 simple steps.",
      },
    ],
  }),
  component: JoinPageNew,
});

function JoinPageNew() {
  const { data: settings } = useSuspenseQuery(settingsQO);
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const agencyId = settings.agency_id || "2517496";
  const adminWhatsapp = settings.admin_whatsapp || "919555644465";

  const copyAgencyId = () => {
    navigator.clipboard.writeText(agencyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      num: "1",
      icon: <Smartphone className="h-6 w-6" />,
      title: "Open Poppo Live",
      desc: "Download and open the Poppo Live app. Log in to your account or create one.",
      color: "from-pink-500/20 to-pink-500/5",
      borderColor: "border-pink-500/30",
    },
    {
      num: "2",
      icon: <Settings className="h-6 w-6" />,
      title: "Go to Settings",
      desc: "Tap Profile (bottom right) → tap Settings (gear icon) → tap Join Agency.",
      color: "from-orange-500/20 to-orange-500/5",
      borderColor: "border-orange-500/30",
    },
    {
      num: "3",
      icon: <UserPlus className="h-6 w-6" />,
      title: "Enter Agency ID",
      desc: "Paste our Agency ID into the Agency Number field and tap Join.",
      color: "from-gold/20 to-gold/5",
      borderColor: "border-gold/30",
      highlight: true,
    },
    {
      num: "4",
      icon: <CheckCircle2 className="h-6 w-6" />,
      title: "You're In!",
      desc: "That's it! You're now part of Barbieverse. Start streaming and earning.",
      color: "from-green-500/20 to-green-500/5",
      borderColor: "border-green-500/30",
    },
  ];

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
            <BadgeCheck className="h-3.5 w-3.5" /> Official Poppo Agency
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            Join <span className="text-gradient-pink">Barbieverse</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            4 simple steps. Takes less than 2 minutes.
          </p>
        </div>

        {/* Visual Path Illustration */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="relative rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Profile</span>
              <ArrowRight className="h-3 w-3" />
              <span className="font-semibold text-foreground">Settings</span>
              <ArrowRight className="h-3 w-3" />
              <span className="font-semibold text-gold">Join Agency</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Look for "Join Agency" in your Poppo app settings
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="mx-auto mt-8 max-w-lg space-y-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`relative rounded-2xl border ${step.borderColor} bg-gradient-to-br ${step.color} p-5 backdrop-blur-md transition-all duration-200 hover:border-primary/40 ${step.highlight ? "ring-2 ring-gold/30" : ""}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground">
                  {step.num}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                    {step.icon}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>

                  {/* Agency ID box for step 3 */}
                  {step.highlight && (
                    <div className="mt-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                        Agency ID
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-xl border border-gold/40 bg-background/60 px-4 py-3 font-mono text-xl font-bold text-gold">
                          {agencyId}
                        </div>
                        <button
                          onClick={copyAgencyId}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-gold text-black transition-transform hover:scale-105 active:scale-95"
                        >
                          {copied ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {copied && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-500 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Copied! Paste it in the Poppo app
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Need Help */}
        <div className="mx-auto mt-8 max-w-lg text-center">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-md">
            <h3 className="font-display text-lg font-semibold">Need Help?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Our team will guide you through the entire process on WhatsApp.
            </p>
            <a
              href={`https://wa.me/${adminWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi! I want to join Barbieverse agency. Can you help me?")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-6 text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95"
            >
              <MessageCircle className="h-5 w-5" />
              Chat on WhatsApp
            </a>
          </div>
        </div>

        {/* Track Application */}
        <div className="mx-auto mt-6 max-w-lg text-center">
          <Link
            to="/track-application"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Already applied? <span className="font-semibold text-primary">Track your application</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
