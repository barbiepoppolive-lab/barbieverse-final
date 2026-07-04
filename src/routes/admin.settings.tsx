import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getAllSettings, updateSetting } from "@/lib/api/settings.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Save, ToggleLeft, ToggleRight } from "lucide-react";

const settingsQO = queryOptions({ queryKey: ["admin", "settings"], queryFn: () => getAllSettings() });

export const Route = createFileRoute("/admin/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQO),
  component: SettingsPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

const HERO_FIELDS = [
  { key: "hero_eyebrow", label: "Hero Eyebrow (small label above name)", placeholder: "Founder, Barbieverse" },
  { key: "hero_name", label: "Your Name", placeholder: "Barbie" },
  { key: "hero_title", label: "Hero Title / Tagline", placeholder: "India's most trusted home for Poppo/Vone Live creators" },
  { key: "hero_intro", label: "Personal Intro (2-3 sentences)", placeholder: "Hi, I'm Barbie..." },
  { key: "hero_signature", label: "Signature Line", placeholder: "— with love, Barbie" },
  { key: "hero_photo_url", label: "Your Photo URL (leave blank for default)", placeholder: "https://..." },
];

const FIELDS = [
  { key: "upi_id", label: "UPI ID", placeholder: "yourname@upi" },
  { key: "upi_payee_name", label: "UPI Payee Name", placeholder: "Barbieverse" },
  { key: "agency_id", label: "Agency ID (Poppo/Vone)", placeholder: "e.g. 2517496" },
  { key: "poppo_signup_link", label: "Poppo/Vone Signup Link", placeholder: "https://poppo.live/..." },
  { key: "admin_whatsapp", label: "Admin WhatsApp (for notifications)", placeholder: "+9198..." },
  { key: "interakt_webhook_url", label: "Interakt WhatsApp Webhook URL", placeholder: "https://..." },
  { key: "brevo_sender_email", label: "Brevo Sender Email", placeholder: "hello@..." },
  { key: "brevo_sender_name", label: "Brevo Sender Name", placeholder: "Barbieverse" },
];

const USDT_FIELDS = [
  { key: "usdt_network", label: "USDT Network", placeholder: "TRC20 / BEP20 / ERC20" },
  { key: "usdt_wallet_address", label: "USDT Wallet Address", placeholder: "T..." },
  { key: "usdt_inr_rate", label: "USDT → INR Rate (₹ per 1 USDT)", placeholder: "90" },
];

const BANK_FIELDS = [
  { key: "bank_account_name", label: "Account Holder Name", placeholder: "Barbieverse" },
  { key: "bank_account_number", label: "Account Number", placeholder: "1234567890" },
  { key: "bank_ifsc", label: "IFSC Code", placeholder: "HDFC0000123" },
  { key: "bank_name", label: "Bank Name", placeholder: "HDFC Bank" },
  { key: "bank_branch", label: "Branch", placeholder: "Mumbai" },
];

const WARMUP_FIELDS = [
  { key: "email_warmup_start", label: "Starting Daily Limit", placeholder: "10" },
  { key: "email_warmup_daily_increase", label: "Daily Increase", placeholder: "5" },
  { key: "email_warmup_max", label: "Max Daily Limit", placeholder: "100" },
];

const PACKAGES = [
  { key: "coin_package_1", label: "Package 1 (JSON)" },
  { key: "coin_package_2", label: "Package 2 (JSON)" },
  { key: "coin_package_3", label: "Package 3 (JSON)" },
  { key: "coin_package_4", label: "Package 4 (JSON)" },
];

const SCRAPER_FIELDS = [
  { key: "scraper_keywords", label: "Search Keywords (all platforms)", placeholder: "poppo live\nvone live\nlive streaming earn money" },
  { key: "scraper_reddit_subreddits", label: "Reddit Subreddits", placeholder: "WorkOnline\nbeermoney\nbeermoneyindia" },
  { key: "scraper_facebook_queries", label: "Facebook Search Queries", placeholder: "poppo live\nvone live" },
  { key: "scraper_twitter_queries", label: "Twitter Search Queries", placeholder: "poppo live\nvone live" },
  { key: "scraper_youtube_queries", label: "YouTube Search Queries", placeholder: "poppo live earn money\nvone live india" },
];

function SettingsPage() {
  const { data } = useSuspenseQuery(settingsQO);
  const qc = useQueryClient();
  const upd = useServerFn(updateSetting);
  const [draft, setDraft] = useState<Record<string, string>>(data);
  const [saving, setSaving] = useState<string | null>(null);
  const [togglesDirty, setTogglesDirty] = useState(false);
  const [heroLang, setHeroLang] = useState<"en" | "hi" | "tl">("en");

  const save = async (key: string) => {
    setSaving(key);
    try {
      await upd({ data: { key, value: draft[key] || "" } });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    } finally {
      setSaving(null);
    }
  };

  const saveToggles = async () => {
    setSaving("toggles");
    try {
      await upd({ data: { key: "coins_enabled", value: draft.coins_enabled || "true" } });
      await upd({ data: { key: "auto_match_enabled", value: draft.auto_match_enabled || "true" } });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
      setTogglesDirty(false);
    } finally {
      setSaving(null);
    }
  };

  const heroFields = heroLang === "en"
    ? HERO_FIELDS
    : HERO_FIELDS.filter((f) => f.key !== "hero_photo_url").map((f) => ({
        ...f,
        key: `${f.key}_${heroLang}`,
        label: `${f.label} (${heroLang === "hi" ? "Hindi" : "Filipino"})`,
      }));

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">All values used across the website. Editable here.</p>

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Homepage Hero (Personal Intro)</h2>
            <p className="text-xs text-muted-foreground">Edit your photo, name and intro shown on the homepage.</p>
          </div>
          <div className="inline-flex items-center rounded-full border border-border/60 bg-card/40 p-0.5 text-xs font-semibold">
            {(["en", "hi", "tl"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setHeroLang(l)}
                className={`rounded-full px-3 py-1 transition-colors ${
                  heroLang === l ? "bg-gradient-pink text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l === "en" ? "EN" : l === "hi" ? "हि" : "TL"}
              </button>
            ))}
          </div>
        </div>
        {heroLang !== "en" && (
          <p className="text-xs text-amber-500">
            Editing {heroLang === "hi" ? "Hindi" : "Filipino"} translations. Leave blank to fall back to English.
          </p>
        )}
        {heroFields.map((f) => (
          <Row key={f.key} field={f} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} onSave={() => save(f.key)} saving={saving === f.key} />
        ))}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-bold">Toggles</h2>
        <p className="text-xs text-muted-foreground">Enable or disable features on the site.</p>
        <ToggleRow
          label="Coin Sales"
          description="Show the coin recharge page and packages"
          value={draft.coins_enabled !== "false"}
          onChange={(v) => { setDraft({ ...draft, coins_enabled: v ? "true" : "false" }); setTogglesDirty(true); }}
        />
        <ToggleRow
          label="Auto-Match UPI Payments"
          description="Automatically match UPI payments via webhook (requires MacroDroid on phone)"
          value={draft.auto_match_enabled !== "false"}
          onChange={(v) => { setDraft({ ...draft, auto_match_enabled: v ? "true" : "false" }); setTogglesDirty(true); }}
        />
        <button
          onClick={saveToggles}
          disabled={saving === "toggles" || !togglesDirty}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-pink px-5 text-sm font-bold text-primary-foreground disabled:opacity-40 transition-opacity"
        >
          <Save className="h-4 w-4" /> {saving === "toggles" ? "Saving..." : togglesDirty ? "Save Changes" : "No Changes"}
        </button>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-bold">General</h2>
        {FIELDS.map((f) => (
          <Row key={f.key} field={f} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} onSave={() => save(f.key)} saving={saving === f.key} />
        ))}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-bold">USDT (Crypto)</h2>
        {USDT_FIELDS.map((f) => (
          <Row key={f.key} field={f} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} onSave={() => save(f.key)} saving={saving === f.key} />
        ))}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-bold">Bank / NetBanking</h2>
        {BANK_FIELDS.map((f) => (
          <Row key={f.key} field={f} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} onSave={() => save(f.key)} saving={saving === f.key} />
        ))}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-bold">Coin Packages</h2>
        <p className="text-xs text-muted-foreground">Format: <code>{`{"name":"Starter","coins":100,"price":99}`}</code></p>
        {PACKAGES.map((f) => (
          <Row key={f.key} field={f} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} onSave={() => save(f.key)} saving={saving === f.key} mono />
        ))}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-bold">Scraper Keywords</h2>
        <p className="text-xs text-muted-foreground">One keyword per line. Used to find leads on Reddit, Facebook, Twitter, YouTube.</p>
        {SCRAPER_FIELDS.map((f) => (
          <TextareaRow key={f.key} field={f} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} onSave={() => save(f.key)} saving={saving === f.key} />
        ))}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-bold">Email Warmup</h2>
        <p className="text-xs text-muted-foreground">Controls daily email sending limit. Starts low and increases over time to build sender reputation.</p>
        {WARMUP_FIELDS.map((f) => (
          <Row key={f.key} field={f} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} onSave={() => save(f.key)} saving={saving === f.key} mono />
        ))}
      </section>
    </div>
  );
}

function Row({
  field, value, onChange, onSave, saving, mono,
}: {
  field: { key: string; label: string; placeholder?: string };
  value: string | undefined;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
      <div className="mt-2 flex gap-2">
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`h-10 flex-1 rounded-lg border border-input bg-input/40 px-3 text-sm focus:border-primary focus:outline-none ${mono ? "font-mono" : ""}`}
        />
        <button onClick={onSave} disabled={saving} className="inline-flex h-10 items-center gap-1 rounded-lg bg-gradient-pink px-4 text-xs font-bold text-primary-foreground disabled:opacity-60">
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label, description, value, onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button onClick={() => onChange(!value)} className="shrink-0">
        {value ? (
          <ToggleRight className="h-10 w-10 text-primary" />
        ) : (
          <ToggleLeft className="h-10 w-10 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

function TextareaRow({
  field, value, onChange, onSave, saving,
}: {
  field: { key: string; label: string; placeholder?: string };
  value: string | undefined;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
      <div className="mt-2 flex gap-2">
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="flex-1 rounded-lg border border-input bg-input/40 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none resize-none"
        />
        <button onClick={onSave} disabled={saving} className="inline-flex h-10 items-center gap-1 rounded-lg bg-gradient-pink px-4 text-xs font-bold text-primary-foreground disabled:opacity-60 self-start">
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
