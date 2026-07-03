// Video Reels — AI-powered video reel generator
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { generateReel, listReels, deleteReel, getReelStats } from "@/lib/api/video.functions";
import { REEL_TEMPLATES } from "@/lib/video/pipeline/script-generator";
import {
  Video, Play, Trash2, Download, Loader2, AlertCircle, CheckCircle2,
  Clock, IndianRupee, Film, Zap, Plus,
} from "lucide-react";

const reelsQO = queryOptions({
  queryKey: ["admin", "reels"],
  queryFn: () => listReels(),
});

const statsQO = queryOptions({
  queryKey: ["admin", "reels", "stats"],
  queryFn: () => getReelStats(),
});

export const Route = createFileRoute("/admin/reels")({
  component: VideoReels,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

function VideoReels() {
  const queryClient = useQueryClient();
  const { data: reels } = useSuspenseQuery(reelsQO);
  const { data: stats } = useSuspenseQuery(statsQO);

  const [showForm, setShowForm] = useState(false);
  const [topic, setTopic] = useState("");
  const [template, setTemplate] = useState("marketing");
  const [duration, setDuration] = useState(30);
  const [voiceId, setVoiceId] = useState("rachel");

  const generateMutation = useMutation({
    mutationFn: () =>
      generateReel({
        data: { topic, template, duration_seconds: duration, voice_id: voiceId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reels"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reels", "stats"] });
      setShowForm(false);
      setTopic("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReel({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reels"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reels", "stats"] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Video Reels</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered video reel generator for marketing and content.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/40 hover:scale-105"
        >
          <Plus className="h-4 w-4" /> Generate Reel
        </button>
      </div>

      {/* ── Stats Cards ─────────────────────────── */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Film} label="Total Reels" value={stats.totals.total_reels || 0} accent />
        <Stat icon={CheckCircle2} label="Completed" value={stats.totals.completed || 0} />
        <Stat
          icon={IndianRupee}
          label="Total Cost"
          value={`$${Number(stats.totals.total_cost || 0).toFixed(2)}`}
        />
        <Stat
          icon={Clock}
          label="Total Duration"
          value={`${Number(stats.totals.total_duration || 0).toFixed(0)}s`}
        />
      </div>

      {/* ── Generate Form ───────────────────────── */}
      {showForm && (
        <div className="mt-8 rounded-2xl border border-primary/40 bg-card/60 p-6 backdrop-blur-md glow-pink">
          <h3 className="font-display text-lg font-bold">Generate New Reel</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Topic */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Topic / Subject
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. How to earn money on Poppo Live, Top 5 features, Creator success story..."
                className="w-full rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Template */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Template</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm"
              >
                {Object.entries(REEL_TEMPLATES).map(([key, t]) => (
                  <option key={key} value={key}>
                    {t.name} — {t.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Duration (seconds)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm"
              >
                <option value={15}>15 seconds (~$0.50)</option>
                <option value={30}>30 seconds (~$1.00)</option>
                <option value={45}>45 seconds (~$1.50)</option>
                <option value={60}>60 seconds (~$2.00)</option>
              </select>
            </div>

            {/* Voice */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Voice
              </label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm"
              >
                <option value="rachel">Rachel (Female, American)</option>
                <option value="bella">Bella (Female, Soft)</option>
                <option value="elli">Elli (Female, Young)</option>
                <option value="josh">Josh (Male, American)</option>
                <option value="arnold">Arnold (Male, Deep)</option>
                <option value="antoni">Antoni (Male, Warm)</option>
                <option value="domi">Domi (Female, Bold)</option>
                <option value="sam">Sam (Male, Narrator)</option>
              </select>
            </div>

            {/* Cost estimate */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Estimated cost:</span>
              <span className="font-bold">
                ~${(0.01 + 0.03 + Math.ceil(duration / 6) * 0.21).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => generateMutation.mutate()}
              disabled={!topic.trim() || generateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Generate Reel
                </>
              )}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            {generateMutation.isError && (
              <span className="text-sm text-destructive">
                {(generateMutation.error as Error).message}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Reels List ──────────────────────────── */}
      <div className="mt-8">
        <h3 className="font-display text-lg font-bold">Generated Reels</h3>
        {reels.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-12 text-center">
            <Video className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">No reels generated yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Plus className="h-4 w-4" /> Generate your first reel
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reels.map((reel: any) => (
              <ReelCard
                key={reel.id}
                reel={reel}
                onDelete={() => deleteMutation.mutate(reel.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReelCard({ reel, onDelete }: { reel: any; onDelete: () => void }) {
  const statusColors: Record<string, string> = {
    completed: "text-green-400 bg-green-400/10",
    failed: "text-red-400 bg-red-400/10",
    generating_voice: "text-blue-400 bg-blue-400/10",
    generating_visuals: "text-purple-400 bg-purple-400/10",
    assembling: "text-yellow-400 bg-yellow-400/10",
    draft: "text-muted-foreground bg-muted/40",
  };

  const statusIcons: Record<string, any> = {
    completed: CheckCircle2,
    failed: AlertCircle,
    generating_voice: Loader2,
    generating_visuals: Loader2,
    assembling: Loader2,
    draft: Clock,
  };

  const Icon = statusIcons[reel.status] || Clock;
  const colorClass = statusColors[reel.status] || "text-muted-foreground bg-muted/40";

  return (
    <div className="group rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-md transition-all hover:border-primary/40 hover:glow-pink">
      <div className="flex items-start justify-between">
        <h4 className="font-display font-bold">{reel.title || "Untitled Reel"}</h4>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${colorClass}`}>
          <Icon className={`h-3 w-3 ${reel.status === "generating_voice" || reel.status === "generating_visuals" || reel.status === "assembling" ? "animate-spin" : ""}`} />
          {reel.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {reel.duration_seconds}s
        </span>
        <span className="flex items-center gap-1">
          <Film className="h-3 w-3" /> {reel.template}
        </span>
        <span className="flex items-center gap-1">
          <IndianRupee className="h-3 w-3" /> ${Number(reel.total_cost_usd || 0).toFixed(2)}
        </span>
      </div>

      {reel.script && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground/80">
          {typeof reel.script === "string"
            ? JSON.parse(reel.script)?.hook
            : reel.script?.hook}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        {reel.status === "completed" && reel.final_video_url && (
          <a
            href={`/api/reels/${reel.id}/download`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Download className="h-3 w-3" /> Download
          </a>
        )}
        <button
          onClick={onDelete}
          className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: any;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-card/60 p-5 backdrop-blur-md ${
        accent ? "border-primary/40 glow-pink" : "border-border/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}
