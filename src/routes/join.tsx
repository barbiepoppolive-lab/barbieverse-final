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
  Smartphone,
  Settings,
  UserPlus,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const settingsQO = queryOptions({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join Barbieverse — Start Earning on Poppo/Vone Live | Barbieverse" },
      {
        name: "description",
        content:
          "Join India's top Poppo/Vone creator agency in 4 simple steps. Copy our Agency ID, paste in Poppo/Vone app, and start earning.",
      },
      { property: "og:title", content: "Join Barbieverse — Start Earning on Poppo/Vone Live" },
      {
        property: "og:description",
        content: "Join India's top Poppo/Vone creator agency in 4 simple steps.",
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
  const adminWhatsapp = settings.admin_whatsapp || "919000966360";

  const copyAgencyId = () => {
    navigator.clipboard.writeText(agencyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      num: "1",
      icon: <Smartphone className="h-6 w-6" />,
      title: "Open Poppo/Vone Live",
      desc: "Download and open the Poppo/Vone Live app. Log in to your account or create one.",
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
            <BadgeCheck className="h-3.5 w-3.5" /> Official Poppo/Vone Agency
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
              Look for "Join Agency" in your Poppo/Vone app settings
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
                          Copied! Paste it in the Poppo/Vone app
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
              <WhatsAppIcon className="h-5 w-5" />
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
