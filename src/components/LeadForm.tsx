import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitLead } from "@/lib/api/leads.functions";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

type Props = { source: "direct" | "wobb"; successMsg?: string };

export function LeadForm({ source, successMsg }: Props) {
  const submit = useServerFn(submitLead);
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-card/60 p-8 text-center backdrop-blur-md">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-bold">{t("lead.success.title")}</h2>
        <p className="mt-2 text-muted-foreground">
          {successMsg || t("lead.success.desc")}
        </p>
        {!successMsg && (
          <div className="mt-6 space-y-3 rounded-xl bg-secondary/50 p-4 text-left text-sm">
            <div className="font-semibold">{t("lead.success.next")}</div>
            <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
              <li>{t("lead.success.step1")}</li>
              <li>{t("lead.success.step2")}</li>
              <li>{t("lead.success.step3")}</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        const data = {
          name: String(fd.get("name") || ""),
          instagram: String(fd.get("instagram") || ""),
          email: String(fd.get("email") || ""),
          whatsapp: String(fd.get("whatsapp") || ""),
          city: String(fd.get("city") || ""),
          follower_count: String(fd.get("follower_count") || "under_1k") as any,
          source,
        };
        try {
          const res = await submit({ data });
          if ((res as any)?.ok) setDone(true);
          else setError(t("lead.error"));
        } catch (err: any) {
          setError(err?.message || t("lead.error.submit"));
        } finally {
          setLoading(false);
        }
      }}
      className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md sm:p-8"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Sparkles className="h-4 w-4" /> {t("lead.title")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label={t("lead.name")} placeholder={t("lead.name.placeholder")} required />
        <Field name="instagram" label={t("lead.instagram")} placeholder={t("lead.instagram.placeholder")} />
        <Field name="email" type="email" label={t("lead.email")} placeholder={t("lead.email.placeholder")} required />
        <Field name="whatsapp" label={t("lead.whatsapp")} placeholder={t("lead.whatsapp.placeholder")} required />
        <Field name="city" label={t("lead.city")} placeholder={t("lead.city.placeholder")} />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t("lead.followers")}
          </label>
          <select
            name="follower_count"
            required
            defaultValue="under_1k"
            className="h-11 w-full rounded-lg border border-input bg-input/50 px-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="under_1k">{t("lead.followers.u1k")}</option>
            <option value="1k_10k">{t("lead.followers.1k10k")}</option>
            <option value="10k_100k">{t("lead.followers.10k100k")}</option>
            <option value="100k_plus">{t("lead.followers.100k")}</option>
          </select>
        </div>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground glow-pink transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {loading ? t("lead.submitting") : t("lead.submit")}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        {t("lead.agree")}
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-input bg-input/50 px-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
      />
    </div>
  );
}
