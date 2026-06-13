import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getAllSettings, updateSetting } from "@/lib/api/settings.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Save, ExternalLink, FileText, Eye } from "lucide-react";
import {
  POLICY_KEYS,
  POLICY_META,
  DEFAULT_POLICY_CONTENT,
  CONTACT_KEYS,
  CONTACT_DEFAULTS,
  type PolicyKey,
  type ContactKey,
} from "@/lib/policy-defaults";
import { MarkdownContent } from "@/components/MarkdownContent";

const settingsQO = queryOptions({ queryKey: ["admin", "settings"], queryFn: () => getAllSettings() });

export const Route = createFileRoute("/admin/policies")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQO),
  component: PoliciesPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

function PoliciesPage() {
  const { data } = useSuspenseQuery(settingsQO);
  const qc = useQueryClient();
  const upd = useServerFn(updateSetting);

  const initial: Record<string, string> = {};
  for (const k of POLICY_KEYS) initial[k] = data[k] || DEFAULT_POLICY_CONTENT[k];
  for (const k of CONTACT_KEYS) initial[k] = data[k] || CONTACT_DEFAULTS[k];

  const [draft, setDraft] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [preview, setPreview] = useState<PolicyKey | null>(null);

  const save = async (key: string) => {
    setSaving(key);
    try {
      await upd({ data: { key, value: draft[key] || "" } });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
      setSaved(key);
      setTimeout(() => setSaved((cur) => (cur === key ? null : cur)), 2000);
    } finally {
      setSaving(null);
    }
  };

  const resetToDefault = (key: PolicyKey) => {
    setDraft({ ...draft, [key]: DEFAULT_POLICY_CONTENT[key] });
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Policy Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit the legal & contact content shown across BarbieVerse — without touching code.
            Supports Markdown: <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-[11px]">## Heading</code>, lists, <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-[11px]">**bold**</code>, links.
          </p>
        </div>
      </div>

      <section className="mt-8 space-y-6">
        <h2 className="font-display text-lg font-bold">Policy Pages</h2>
        {POLICY_KEYS.map((k) => {
          const meta = POLICY_META[k];
          return (
            <div key={k} className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-gold">{meta.eyebrow}</div>
                  <div className="mt-1 font-display text-xl font-medium">{meta.title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={meta.slug as any} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-xs hover:border-primary">
                    <ExternalLink className="h-3.5 w-3.5" /> View live
                  </Link>
                  <button
                    onClick={() => setPreview(preview === k ? null : k)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-xs hover:border-primary"
                  >
                    <Eye className="h-3.5 w-3.5" /> {preview === k ? "Hide preview" : "Preview"}
                  </button>
                  <button
                    onClick={() => resetToDefault(k)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-xs hover:border-destructive hover:text-destructive"
                  >
                    Reset to default
                  </button>
                </div>
              </div>

              <textarea
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                rows={18}
                className="mt-4 w-full resize-y rounded-xl border border-input bg-input/40 px-3 py-3 font-mono text-[12px] leading-relaxed focus:border-primary focus:outline-none"
              />

              {preview === k && (
                <div className="mt-4 rounded-2xl border border-gold/20 bg-background/40 p-5 backdrop-blur-md">
                  <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold">
                    <FileText className="h-3.5 w-3.5" /> Live Preview
                  </div>
                  <MarkdownContent source={draft[k]} />
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => save(k)}
                  disabled={saving === k}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gradient-pink px-4 text-xs font-bold text-primary-foreground disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" /> {saving === k ? "Saving..." : "Save policy"}
                </button>
                {saved === k && <span className="text-xs text-emerald-400">Saved ✓</span>}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="font-display text-lg font-bold">Contact Information</h2>
        <p className="text-xs text-muted-foreground">Shown on the public <Link to="/contact" className="font-semibold text-gold hover:underline">/contact</Link> page.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTACT_KEYS.map((k) => (
            <ContactField
              key={k}
              k={k}
              value={draft[k]}
              onChange={(v) => setDraft({ ...draft, [k]: v })}
              onSave={() => save(k)}
              saving={saving === k}
              saved={saved === k}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ContactField({ k, value, onChange, onSave, saving, saved }: {
  k: ContactKey;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const isLong = k === "contact_response_time" || k === "contact_recharge_value";
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.replace(/_/g, " ")}</label>
      {isLong ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-2 w-full resize-y rounded-lg border border-input bg-input/40 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      ) : (
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 h-10 w-full rounded-lg border border-input bg-input/40 px-3 text-sm focus:border-primary focus:outline-none"
        />
      )}
      <div className="mt-2 flex items-center gap-2">
        <button onClick={onSave} disabled={saving} className="inline-flex h-9 items-center gap-1 rounded-lg bg-gradient-pink px-3 text-[11px] font-bold text-primary-foreground disabled:opacity-60">
          <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-[11px] text-emerald-400">Saved ✓</span>}
      </div>
    </div>
  );
}
