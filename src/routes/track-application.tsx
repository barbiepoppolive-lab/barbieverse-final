import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/SiteLayout";
import { trackCreatorApplication } from "@/lib/api/creator-leads.functions";
import { attachPoppoHostId } from "@/lib/api/attribution.functions";
import { CheckCircle2, Clock, XCircle, Search, Link2 } from "lucide-react";

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
  const attachHost = useServerFn(attachPoppoHostId);
  const [query, setQuery] = useState(search.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lead, setLead] = useState<any | null>(null);
  const [hostId, setHostId] = useState("");
  const [hostCode, setHostCode] = useState("");
  const [hostLoading, setHostLoading] = useState(false);
  const [hostSuccess, setHostSuccess] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);

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

  async function submitHostId() {
    if (!lead?.application_id || !hostId.trim()) return;
    setHostLoading(true);
    setHostError(null);
    setHostSuccess(false);
    try {
      const res = await attachHost({
        data: {
          application_id: lead.application_id,
          poppo_host_id: hostId.trim(),
          poppo_host_code: hostCode.trim() || undefined,
        },
      });
      if (res?.ok) {
        setHostSuccess(true);
        setLead({ ...lead, poppo_host_id: hostId.trim(), host_verified_at: new Date().toISOString() });
      } else {
        setHostError(res?.message || "Failed to attach Host ID.");
      }
    } catch (e: any) {
      setHostError(e?.message || "Failed to attach Host ID.");
    } finally {
      setHostLoading(false);
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

        {lead && (
          <LeadCard
            lead={lead}
            hostId={hostId}
            setHostId={setHostId}
            hostCode={hostCode}
            setHostCode={setHostCode}
            hostLoading={hostLoading}
            hostSuccess={hostSuccess}
            hostError={hostError}
            submitHostId={submitHostId}
          />
        )}
      </section>
    </SiteLayout>
  );
}

function LeadCard({
  lead,
  hostId,
  setHostId,
  hostCode,
  setHostCode,
  hostLoading,
  hostSuccess,
  hostError,
  submitHostId,
}: {
  lead: any;
  hostId: string;
  setHostId: (v: string) => void;
  hostCode: string;
  setHostCode: (v: string) => void;
  hostLoading: boolean;
  hostSuccess: boolean;
  hostError: string | null;
  submitHostId: () => void;
}) {
  const stageIdx = STATUS_TO_STAGE[lead.status] ?? 0;
  const rejected = lead.status === "Rejected";
  const hasHostId = !!lead.poppo_host_id;

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
        <Info label="Platform" value={lead.platform === "vone" ? "Vone" : "Poppo/Vone"} />
        <Info label="Reward Status" value={lead.reward_status || "Pending"} />
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

      {/* Host ID capture section */}
      {!hasHostId && !rejected && (
        <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gold">
            <Link2 className="h-4 w-4" />
            Link Your Poppo Host ID
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Enter your Poppo Host ID to link your account. You can find this in Poppo under Profile → My Agency.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Host ID *</label>
              <input
                value={hostId}
                onChange={(e) => setHostId(e.target.value)}
                placeholder="e.g. 2697095"
                className="mt-1 h-10 w-full rounded-xl border border-border/60 bg-background/60 px-4 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Host Code (optional)</label>
              <input
                value={hostCode}
                onChange={(e) => setHostCode(e.target.value)}
                placeholder="Your host code"
                className="mt-1 h-10 w-full rounded-xl border border-border/60 bg-background/60 px-4 text-sm"
              />
            </div>
            <button
              onClick={submitHostId}
              disabled={hostLoading || !hostId.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-gold px-5 text-xs font-semibold text-black disabled:opacity-60"
            >
              {hostLoading ? "Linking…" : "Link Host ID"}
            </button>
            {hostSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Host ID linked successfully!
              </div>
            )}
            {hostError && (
              <div className="text-xs text-destructive">{hostError}</div>
            )}
          </div>
        </div>
      )}

      {hasHostId && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Host ID linked: {lead.poppo_host_id}
        </div>
      )}
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
