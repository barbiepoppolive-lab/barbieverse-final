import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getAllSettings, updateSetting } from "@/lib/api/settings.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Save } from "lucide-react";

const settingsQO = queryOptions({ queryKey: ["admin", "settings"], queryFn: () => getAllSettings() });

export const Route = createFileRoute("/admin/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQO),
  component: SettingsPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

const HERO_FIELDS = [
  { key: "hero_eyebrow", label: "Hero Eyebrow (small label above name)", placeholder: "Founder, Barbieverse" },
  { key: "hero_name", label: "Your Name", placeholder: "Barbie" },
  { key: "hero_title", label: "Hero Title / Tagline", placeholder: "India's most trusted home for Poppo Live creators" },
  { key: "hero_intro", label: "Personal Intro (2-3 sentences)", placeholder: "Hi, I'm Barbie..." },
  { key: "hero_signature", label: "Signature Line", placeholder: "— with love, Barbie" },
  { key: "hero_photo_url", label: "Your Photo URL (leave blank for default)", placeholder: "https://..." },
];

const FIELDS = [
  { key: "upi_id", label: "UPI ID", placeholder: "yourname@upi" },
  { key: "upi_payee_name", label: "UPI Payee Name", placeholder: "Barbieverse" },
  { key: "poppo_signup_link", label: "Poppo Signup Link", placeholder: "https://poppo.live/..." },
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

const PACKAGES = [
  { key: "coin_package_1", label: "Package 1 (JSON)" },
  { key: "coin_package_2", label: "Package 2 (JSON)" },
  { key: "coin_package_3", label: "Package 3 (JSON)" },
  { key: "coin_package_4", label: "Package 4 (JSON)" },
];

function SettingsPage() {
  const { data } = useSuspenseQuery(settingsQO);
  const qc = useQueryClient();
  const upd = useServerFn(updateSetting);
  const [draft, setDraft] = useState<Record<string, string>>(data);
  const [saving, setSaving] = useState<string | null>(null);

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

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">All values used across the website. Editable here.</p>

      <section className="mt-8 space-y-4">
        <h2 className="font-display text-lg font-bold">Homepage Hero (Personal Intro)</h2>
        <p className="text-xs text-muted-foreground">Edit your photo, name and intro shown on the homepage.</p>
        {HERO_FIELDS.map((f) => (
          <Row key={f.key} field={f} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} onSave={() => save(f.key)} saving={saving === f.key} />
        ))}
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
