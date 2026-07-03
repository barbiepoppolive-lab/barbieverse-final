import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { generateBlogPost, generateSocialPost, listContentJobs, getContentStats, deleteContentJob } from "@/lib/api/content-ai.functions";
import { FileText, MessageCircle, Trash2, Loader2, IndianRupee, Eye } from "lucide-react";

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
              <div key={job.id} className="rounded-2xl border border-border/60 bg-card/60 p-5 transition-all hover:border-primary/40">
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
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>${Number(job.total_cost_usd || 0).toFixed(4)}</span>
                  <span>{new Date(job.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                <button onClick={() => delMut.mutate(job.id)} className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
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
