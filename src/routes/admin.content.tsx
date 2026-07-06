import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { generateBlogPost, generateSocialPost, listContentJobs, getContentStats, deleteContentJob } from "@/lib/api/content-ai.functions";
import { FileText, MessageCircle, Trash2, Loader2, IndianRupee, Eye, X, Copy, Download, Music, Play, Pause, Volume2 } from "lucide-react";

const jobsQO = (type?: string) =>
  queryOptions({ queryKey: ["admin", "content-jobs", type], queryFn: () => listContentJobs({ data: { type } }) });
const statsQO = queryOptions({ queryKey: ["admin", "content-stats"], queryFn: () => getContentStats() });

export const Route = createFileRoute("/admin/content")({ component: ContentDashboard });

function ContentDashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"blog" | "social">("blog");
  const [filterType, setFilterType] = useState<string | undefined>();
  const { data: jobs } = useSuspenseQuery(jobsQO(filterType));
  const { data: stats } = useSuspenseQuery(statsQO);
  const [detailJob, setDetailJob] = useState<any>(null);

  const [blogTopic, setBlogTopic] = useState("");
  const [blogFormat, setBlogFormat] = useState("guide");
  const [blogWords, setBlogWords] = useState(800);
  const [socialPlatform, setSocialPlatform] = useState("instagram");
  const [socialTopic, setSocialTopic] = useState("");
  const [socialGoal, setSocialGoal] = useState("engagement");

  const blogMut = useMutation({
    mutationFn: () => generateBlogPost({ data: { topic: blogTopic, format: blogFormat, word_count: blogWords } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "content-jobs"] }); qc.invalidateQueries({ queryKey: ["admin", "content-stats"] }); setBlogTopic(""); },
  });
  const socialMut = useMutation({
    mutationFn: () => generateSocialPost({ data: { platform: socialPlatform, topic: socialTopic, goal: socialGoal } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "content-jobs"] }); qc.invalidateQueries({ queryKey: ["admin", "content-stats"] }); setSocialTopic(""); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteContentJob({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "content-jobs"] }); qc.invalidateQueries({ queryKey: ["admin", "content-stats"] }); },
  });

  return (
    <div>
      <div>
        <h1 className="font-display text-3xl font-bold">Content Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">AI-powered blog posts and social media content.</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={FileText} label="Total Jobs" value={stats.totals.total_jobs || 0} />
        <Card icon={Eye} label="Completed" value={stats.totals.completed || 0} />
        <Card icon={IndianRupee} label="Total Cost" value={`$${Number(stats.totals.total_cost || 0).toFixed(2)}`} />
        <Card icon={IndianRupee} label="Avg Cost" value={`$${Number(stats.totals.avg_cost || 0).toFixed(4)}`} />
      </div>

      <div className="mt-8 flex gap-4 border-b border-border/60">
        <button onClick={() => setTab("blog")} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "blog" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Blog Posts</button>
        <button onClick={() => setTab("social")} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "social" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Social Posts</button>
      </div>

      {tab === "blog" && (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-display text-lg font-bold">Generate Blog Post</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Topic</label>
              <input value={blogTopic} onChange={(e) => setBlogTopic(e.target.value)} placeholder="How to earn money on Poppo Live..." className="w-full rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Format</label>
              <select value={blogFormat} onChange={(e) => setBlogFormat(e.target.value)} className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm">
                <option value="guide">Guide</option><option value="listicle">Listicle</option><option value="how-to">How-To</option><option value="story">Story</option><option value="news">News</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Word Count</label>
              <select value={blogWords} onChange={(e) => setBlogWords(Number(e.target.value))} className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm">
                <option value={500}>500</option><option value={800}>800</option><option value={1200}>1200</option><option value={2000}>2000</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => blogMut.mutate()} disabled={!blogTopic.trim() || blogMut.isPending} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50">
              {blogMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><FileText className="h-4 w-4" /> Generate Blog Post</>}
            </button>
            {blogMut.isError && <span className="text-sm text-destructive">{(blogMut.error as Error).message}</span>}
          </div>
        </div>
      )}

      {tab === "social" && (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-display text-lg font-bold">Generate Social Post</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Platform</label>
              <select value={socialPlatform} onChange={(e) => setSocialPlatform(e.target.value)} className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm">
                <option value="instagram">Instagram</option><option value="twitter">Twitter</option><option value="linkedin">LinkedIn</option><option value="facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Goal</label>
              <select value={socialGoal} onChange={(e) => setSocialGoal(e.target.value)} className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm">
                <option value="engagement">Engagement</option><option value="traffic">Traffic</option><option value="sales">Sales</option><option value="awareness">Awareness</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Topic</label>
              <input value={socialTopic} onChange={(e) => setSocialTopic(e.target.value)} placeholder="Creator success stories, platform tips..." className="w-full rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => socialMut.mutate()} disabled={!socialTopic.trim() || socialMut.isPending} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50">
              {socialMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><MessageCircle className="h-4 w-4" /> Generate Social Post</>}
            </button>
            {socialMut.isError && <span className="text-sm text-destructive">{(socialMut.error as Error).message}</span>}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Recent Jobs</h3>
          <select value={filterType || ""} onChange={(e) => setFilterType(e.target.value || undefined)} className="rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-sm">
            <option value="">All</option><option value="blog_post">Blog Posts</option><option value="social_post">Social Posts</option>
          </select>
        </div>
        {jobs.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">No content generated yet.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job: any) => (
              <div
                key={job.id}
                className="rounded-2xl border border-border/60 bg-card/60 p-5 transition-all hover:border-primary/40 cursor-pointer"
                onClick={() => setDetailJob(job)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {job.job_type === "blog_post" ? <FileText className="h-4 w-4 text-muted-foreground" /> : <MessageCircle className="h-4 w-4 text-muted-foreground" />}
                    <h4 className="font-medium capitalize">{job.job_type.replace("_", " ")}</h4>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${job.status === "completed" ? "text-green-400 bg-green-400/10" : "text-muted-foreground bg-muted/40"}`}>{job.status}</span>
                </div>
                {job.status === "completed" && job.output_data && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground">{job.job_type === "blog_post" ? "Title" : "Caption"}</p>
                    <p className="mt-1 line-clamp-2 text-sm">{job.output_data.title || job.output_data.caption || "—"}</p>
                  </div>
                )}
                {job.status === "completed" && job.output_data?.audio?.full?.audioUrl && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-purple-500">
                    <Music className="h-3 w-3" /> Audio narration available
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>${Number(job.total_cost_usd || 0).toFixed(4)}</span>
                  <span>{new Date(job.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setDetailJob(job)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"><Eye className="h-3 w-3" /> View</button>
                  <button onClick={() => delMut.mutate(job.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {detailJob && (
        <ContentDetailDrawer job={detailJob} onClose={() => setDetailJob(null)} />
      )}
    </div>
  );
}

// ── Content Detail Drawer ───────────────────────────────

function ContentDetailDrawer({ job, onClose }: { job: any; onClose: () => void }) {
  const output = job.output_data || {};

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-2xl bg-background shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 backdrop-blur p-4">
          <div>
            <h2 className="font-semibold">{output.title || output.caption || job.job_type.replace("_", " ").toUpperCase()}</h2>
            <p className="text-xs text-muted-foreground">{job.status} — {new Date(job.created_at).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-muted p-2 hover:bg-muted/80"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Blog Post */}
          {job.job_type === "blog_post" && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">{output.title}</h3>
              <p className="text-sm text-muted-foreground italic">{output.excerpt}</p>
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: output.content }} />
              </div>
              {output.category && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{output.category}</span>}
              <div className="flex flex-wrap gap-1">
                {output.tags?.map((tag: string, i: number) => (
                  <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">{tag}</span>
                ))}
              </div>
              {output.audio?.audioUrl && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <AudioPlayer url={output.audio.audioUrl} />
                </div>
              )}
            </div>
          )}

          {/* Social Post */}
          {job.job_type === "social_post" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm whitespace-pre-wrap">{output.caption}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {output.hashtags?.map((tag: string, i: number) => (
                  <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">#{tag}</span>
                ))}
              </div>
              {output.audio?.audioUrl && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <AudioPlayer url={output.audio.audioUrl} />
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>Job ID</span><span className="font-mono">{job.id.slice(0, 8)}...</span></div>
            <div className="flex justify-between"><span>Cost</span><span>${Number(job.total_cost_usd || 0).toFixed(4)}</span></div>
            <div className="flex justify-between"><span>Created</span><span>{new Date(job.created_at).toLocaleString()}</span></div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(output, null, 2))} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm hover:bg-muted/80">
              <Copy className="h-4 w-4" /> Copy JSON
            </button>
            <button onClick={() => {
              const text = job.job_type === "blog_post" ? `# ${output.title}\n\n${output.excerpt}\n\n${output.content}` : `${output.caption}\n\n${output.hashtags?.map((t: string) => `#${t}`).join(" ")}`;
              const blob = new Blob([text], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `${job.job_type}_${Date.now()}.md`; a.click();
            }} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm hover:bg-muted/80">
              <Download className="h-4 w-4" /> Export MD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Audio Player ────────────────────────────────────────

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audio) {
      const a = new Audio(url);
      setAudio(a);
      a.play();
      setPlaying(true);
      a.onended = () => setPlaying(false);
    } else {
      if (playing) audio.pause(); else audio.play();
      setPlaying(!playing);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button onClick={toggle} className="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex-1">
        <p className="text-xs font-medium">Audio Narration</p>
        <p className="text-[10px] text-muted-foreground">Click to play voiceover</p>
      </div>
      <Volume2 className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function Card({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}
