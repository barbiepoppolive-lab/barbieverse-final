import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/SiteLayout";
import { trackCreatorApplication } from "@/lib/api/creator-leads.functions";
import { CheckCircle2, Clock, XCircle, Search } from "lucide-react";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/track-application")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Track Your Application — BarbieVerse" },
      { name: "description", content: "Track the status of your BarbieVerse creator agency application." },
    ],
  }),
  component: TrackPage,
});

const STAGES = [
  "Application Submitted",
  "Joined Platform",
  "Verified Creator",
  "Reward Eligible",
  "Reward Paid",
] as const;

const STATUS_TO_STAGE: Record<string, number> = {
  "Lead Created": 0,
  "Joined Platform": 1,
  "Verified Creator": 2,
  "First Stream Completed": 2,
  "Reward Eligible": 3,
  "Reward Paid": 4,
  "Rejected": -1,
};

function TrackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const track = useServerFn(trackCreatorApplication);
  const [query, setQuery] = useState(search.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lead, setLead] = useState<any | null>(null);

  async function lookup(q: string) {
    setLoading(true);
    setError(null);
    setLead(null);
    try {
      const res = await track({ data: { query: q } });
      if (!res.ok) setError(res.message);
      else setLead(res.lead);
    } catch (e: any) {
      setError(e?.message || "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (search.id) lookup(search.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-2xl px-4 py-14 sm:py-20">
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">Creator Portal</div>
          <h1 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            Track <span className="italic text-gradient-pink">Your Application</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enter your BarbieVerse Application ID or registered mobile number.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!query.trim()) return;
            navigate({ search: { id: query.trim() } });
            lookup(query.trim());
          }}
          className="mt-8 flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BV-12345 or 9876543210"
            className="h-12 flex-1 rounded-full border border-input bg-input/40 px-5 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-pink px-6 text-xs font-semibold uppercase tracking-wider text-primary-foreground glow-pink disabled:opacity-60"
          >
            <Search className="h-4 w-4" /> {loading ? "Searching…" : "Track"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {lead && <LeadCard lead={lead} />}
      </section>
    </SiteLayout>
  );
}

function LeadCard({ lead }: { lead: any }) {
  const stageIdx = STATUS_TO_STAGE[lead.status] ?? 0;
  const rejected = lead.status === "Rejected";

  return (
    <div className="mt-8 rounded-3xl border border-gold/25 bg-card/60 p-6 backdrop-blur-xl shadow-luxe sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">Application ID</div>
          <div className="mt-1 font-display text-2xl font-bold text-gradient-pink">{lead.application_id}</div>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Info label="Platform" value={lead.platform === "vone" ? "Vone" : "Poppo"} />
        <Info label="Reward Status" value={lead.reward_status} />
        <Info label="Submitted" value={new Date(lead.created_at).toLocaleString("en-IN")} />
        <Info label="Last Updated" value={new Date(lead.updated_at).toLocaleString("en-IN")} />
      </dl>

      <div className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress</div>
        <ol className="mt-3 space-y-2.5">
          {STAGES.map((stage, i) => {
            const done = !rejected && i <= stageIdx;
            const current = !rejected && i === stageIdx;
            return (
              <li key={stage} className="flex items-center gap-2.5 text-sm">
                {rejected ? (
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                ) : done ? (
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${current ? "text-primary" : "text-emerald-500"}`} />
                ) : (
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className={done ? "text-foreground" : "text-muted-foreground"}>{stage}</span>
              </li>
            );
          })}
        </ol>
        {rejected && (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            This application was not approved. Please contact support if you believe this is an error.
          </p>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

const BADGE_COLORS: Record<string, string> = {
  "Lead Created": "bg-muted text-muted-foreground",
  "Joined Platform": "bg-blue-500/20 text-blue-300",
  "Verified Creator": "bg-purple-500/20 text-purple-300",
  "First Stream Completed": "bg-indigo-500/20 text-indigo-300",
  "Reward Eligible": "bg-orange-500/20 text-orange-300",
  "Reward Paid": "bg-emerald-500/20 text-emerald-300",
  "Rejected": "bg-destructive/20 text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${BADGE_COLORS[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
