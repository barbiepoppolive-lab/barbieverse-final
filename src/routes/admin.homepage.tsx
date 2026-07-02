import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getAllSettings, updateSetting } from "@/lib/api/settings.functions";
import { listAllSlides, upsertSlide, deleteSlide, reorderSlide, type CarouselSlide } from "@/lib/api/carousel.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Save, Trash2, Plus, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";

const settingsQO = queryOptions({ queryKey: ["admin", "settings"], queryFn: () => getAllSettings() });
const slidesQO = queryOptions({ queryKey: ["admin", "slides"], queryFn: () => listAllSlides() });

export const Route = createFileRoute("/admin/homepage")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(settingsQO),
      context.queryClient.ensureQueryData(slidesQO),
    ]),
  component: HomepagePage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

const HERO_FIELDS = [
  { key: "hero_eyebrow", label: "Hero eyebrow" },
  { key: "hero_name", label: "Founder name" },
  { key: "hero_title", label: "Hero headline" },
  { key: "hero_subtitle", label: "Hero supporting headline" },
  { key: "hero_intro", label: "Hero description", textarea: true },
  { key: "hero_signature", label: "Signature line" },
  { key: "hero_photo_url", label: "Founder photo URL" },
  { key: "hero_cta_primary_text", label: "Primary CTA text" },
  { key: "hero_cta_primary_link", label: "Primary CTA link" },
  { key: "hero_cta_secondary_text", label: "Secondary CTA text" },
  { key: "hero_cta_secondary_link", label: "Secondary CTA link" },
  { key: "homepage_announcement", label: "Announcement bar (leave blank to hide)" },
];

const JSON_FIELDS = [
  { key: "hero_trust_badges", label: "Trust badges (JSON array of {icon,label})" },
  { key: "vip_tiers", label: "VIP tiers (JSON array of {icon,name})" },
  { key: "vip_support_text", label: "VIP support text" },
  { key: "vip_cta_text", label: "VIP CTA text" },
];

const CAROUSELS: { type: string; label: string }[] = [
  { type: "why_barbieverse", label: "Carousel 1 — Why Barbieverse" },
  { type: "how_success", label: "Carousel 2 — How Success Happens" },
  { type: "why_choose", label: "Carousel 3 — Why Streamers Choose Barbieverse" },
];

function HomepagePage() {
  const { data: settings } = useSuspenseQuery(settingsQO);
  const { data: slides } = useSuspenseQuery(slidesQO);
  const qc = useQueryClient();
  const upd = useServerFn(updateSetting);
  const upsert = useServerFn(upsertSlide);
  const remove = useServerFn(deleteSlide);
  const reorder = useServerFn(reorderSlide);

  const [draft, setDraft] = useState<Record<string, string>>(settings);
  const [saving, setSaving] = useState<string | null>(null);
  const [heroLang, setHeroLang] = useState<"en" | "hi" | "tl">("en");

  const save = async (key: string) => {
    setSaving(key);
    try {
      await upd({ data: { key, value: draft[key] || "" } });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    } finally { setSaving(null); }
  };

  const refreshSlides = () => {
    qc.invalidateQueries({ queryKey: ["admin", "slides"] });
    qc.invalidateQueries({ queryKey: ["carousel"] });
  };

  const heroFields = heroLang === "en"
    ? HERO_FIELDS
    : HERO_FIELDS.filter((f) => f.key !== "hero_photo_url" && f.key !== "hero_cta_primary_link" && f.key !== "hero_cta_secondary_link").map((f) => ({
        ...f,
        key: `${f.key}_${heroLang}`,
        label: `${f.label} (${heroLang === "hi" ? "Hindi" : "Filipino"})`,
      }));

  return (
    <div className="max-w-4xl space-y-12">
      <header>
        <h1 className="font-display text-3xl font-bold">Homepage Content Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit the hero, trust badges, VIP strip, announcement bar, and all three carousels.</p>
      </header>

      {/* HERO */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Hero & CTAs</h2>
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
          <Row key={f.key} label={f.label} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} onSave={() => save(f.key)} saving={saving === f.key} textarea={f.textarea} />
        ))}
      </section>

      {/* JSON */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Trust badges & VIP</h2>
        {JSON_FIELDS.map((f) => (
          <Row key={f.key} label={f.label} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} onSave={() => save(f.key)} saving={saving === f.key} mono />
        ))}
      </section>

      {/* CAROUSELS */}
      {CAROUSELS.map((c) => (
        <CarouselSection
          key={c.type}
          label={c.label}
          type={c.type}
          slides={slides.filter((s) => s.carousel_type === c.type)}
          onUpsert={async (s) => { await upsert({ data: s as any }); refreshSlides(); }}
          onDelete={async (id) => { await remove({ data: { id } }); refreshSlides(); }}
          onReorder={async (id, direction) => { await reorder({ data: { id, direction } }); refreshSlides(); }}
        />
      ))}
    </div>
  );
}

function Row({ label, value, onChange, onSave, saving, mono, textarea }: {
  label: string; value: string | undefined; onChange: (v: string) => void;
  onSave: () => void; saving: boolean; mono?: boolean; textarea?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-2 flex gap-2">
        {textarea ? (
          <textarea
            value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3}
            className={`flex-1 rounded-lg border border-input bg-input/40 p-3 text-sm focus:border-primary focus:outline-none ${mono ? "font-mono" : ""}`}
          />
        ) : (
          <input
            value={value || ""} onChange={(e) => onChange(e.target.value)}
            className={`h-10 flex-1 rounded-lg border border-input bg-input/40 px-3 text-sm focus:border-primary focus:outline-none ${mono ? "font-mono" : ""}`}
          />
        )}
        <button onClick={onSave} disabled={saving} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-gradient-pink px-4 text-xs font-bold text-primary-foreground disabled:opacity-60">
          <Save className="h-3.5 w-3.5" /> {saving ? "..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function CarouselSection({ label, type, slides, onUpsert, onDelete, onReorder }: {
  label: string; type: string; slides: CarouselSlide[];
  onUpsert: (s: Partial<CarouselSlide> & { carousel_type: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (id: string, direction: "up" | "down") => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{label}</h2>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-bold text-background">
          <Plus className="h-3.5 w-3.5" /> Add slide
        </button>
      </div>

      {creating && (
        <SlideEditor
          initial={{ carousel_type: type, is_active: true, sort_order: (slides.at(-1)?.sort_order ?? 0) + 1 }}
          onCancel={() => setCreating(false)}
          onSave={async (s) => { await onUpsert(s); setCreating(false); }}
        />
      )}

      <div className="space-y-2">
        {slides.map((s, i) => (
          <div key={s.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
            {editing === s.id ? (
              <SlideEditor
                initial={s}
                onCancel={() => setEditing(null)}
                onSave={async (next) => { await onUpsert({ ...next, id: s.id, carousel_type: type }); setEditing(null); }}
              />
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1">
                  <button disabled={i === 0} onClick={() => onReorder(s.id, "up")} className="rounded p-1 hover:bg-primary/15 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button disabled={i === slides.length - 1} onClick={() => onReorder(s.id, "down")} className="rounded p-1 hover:bg-primary/15 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">#{s.sort_order}</span>
                    {s.is_active ? <Eye className="h-3 w-3 text-gold" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                    <span className="font-display text-sm font-bold">{s.title || "(no title)"}</span>
                  </div>
                  {s.subtitle && <div className="mt-0.5 text-xs text-foreground/80">{s.subtitle}</div>}
                  {s.description && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</div>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(s.id)} className="rounded-lg border border-border/60 px-2 py-1 text-xs hover:border-gold/50">Edit</button>
                  <button onClick={() => { if (confirm("Delete this slide?")) onDelete(s.id); }} className="rounded-lg border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {slides.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            No slides yet. Click "Add slide" to create one.
          </div>
        )}
      </div>
    </section>
  );
}

function SlideEditor({ initial, onCancel, onSave }: {
  initial: Partial<CarouselSlide> & { carousel_type: string };
  onCancel: () => void;
  onSave: (s: Partial<CarouselSlide> & { carousel_type: string }) => Promise<void>;
}) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const update = (k: keyof CarouselSlide, v: any) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input label="Title (eyebrow / step name)" value={s.title ?? ""} onChange={(v) => update("title", v)} />
        <Input label="Subtitle (headline)" value={s.subtitle ?? ""} onChange={(v) => update("subtitle", v)} />
      </div>
      <TextArea label="Description" value={s.description ?? ""} onChange={(v) => update("description", v)} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input label="Image URL (optional)" value={s.image_url ?? ""} onChange={(v) => update("image_url", v)} />
        <Input label="Sort order" value={String(s.sort_order ?? 0)} onChange={(v) => update("sort_order", Number(v) || 0)} />
        <Input label="Button text" value={s.button_text ?? ""} onChange={(v) => update("button_text", v)} />
        <Input label="Button link" value={s.button_link ?? ""} onChange={(v) => update("button_link", v)} />
        <Input label="Schedule (ISO, optional)" value={s.scheduled_at ?? ""} onChange={(v) => update("scheduled_at", v || null)} />
        <label className="flex items-center gap-2 px-1 text-xs">
          <input type="checkbox" checked={s.is_active ?? true} onChange={(e) => update("is_active", e.target.checked)} />
          Active
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
        <button
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onSave(s); } finally { setBusy(false); } }}
          className="inline-flex items-center gap-1 rounded-lg bg-gradient-pink px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
        >
          <Save className="h-3 w-3" /> {busy ? "Saving..." : "Save slide"}
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input bg-input/40 px-2 text-sm" />
    </label>
  );
}
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-input bg-input/40 p-2 text-sm" />
    </label>
  );
}
