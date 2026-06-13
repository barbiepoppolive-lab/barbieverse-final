import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitLead } from "@/lib/api/leads.functions";
import { Sparkles, CheckCircle2 } from "lucide-react";

type Props = { source: "direct" | "wobb" };

const followerOptions = [
  { value: "under_1k", label: "Under 1K" },
  { value: "1k_10k", label: "1K – 10K" },
  { value: "10k_100k", label: "10K – 100K" },
  { value: "100k_plus", label: "100K+" },
] as const;

export function LeadForm({ source }: Props) {
  const submit = useServerFn(submitLead);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-card/60 p-8 text-center backdrop-blur-md">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-bold">You're in! 🎉</h2>
        <p className="mt-2 text-muted-foreground">
          We received your details. Our team will reach out on WhatsApp within 24 hours with your
          Poppo Live signup link and your ₹500 bonus instructions.
        </p>
        <div className="mt-6 space-y-3 rounded-xl bg-secondary/50 p-4 text-left text-sm">
          <div className="font-semibold">Next steps:</div>
          <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
            <li>Check your email for the welcome message</li>
            <li>Our team will WhatsApp you with the Poppo signup link</li>
            <li>Sign up & go live once — receive ₹500 instantly</li>
          </ol>
        </div>
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
          else setError("Something went wrong. Please try again.");
        } catch (err: any) {
          setError(err?.message || "Submission failed");
        } finally {
          setLoading(false);
        }
      }}
      className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md sm:p-8"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Sparkles className="h-4 w-4" /> Claim your ₹500 bonus
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Full Name" placeholder="Priya Sharma" required />
        <Field name="instagram" label="Instagram Handle" placeholder="@yourhandle" />
        <Field name="email" type="email" label="Email Address" placeholder="you@email.com" required />
        <Field name="whatsapp" label="WhatsApp Number" placeholder="+91 98765 43210" required />
        <Field name="city" label="City" placeholder="Mumbai" />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Follower Count
          </label>
          <select
            name="follower_count"
            required
            defaultValue="under_1k"
            className="h-11 w-full rounded-lg border border-input bg-input/50 px-3 text-sm focus:border-primary focus:outline-none"
          >
            {followerOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground glow-pink transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Claim ₹500 Bonus →"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        By submitting, you agree to be contacted by Barbieverse on WhatsApp & email.
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
