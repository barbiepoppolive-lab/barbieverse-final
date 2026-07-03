// Content Dashboard — AI-powered content generation hub
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  generateCarousel, generateBlogPost, generateSocialPost,
  generateThumbnail, generateBanner, listContentJobs,
  getContentStats, deleteContentJob,
} from "@/lib/api/content-ai.functions";
import {
  Layers, FileText, Share2, Image, PanelTop, Trash2, Loader2,
  AlertCircle, CheckCircle2, Clock, IndianRupee, Zap, Plus, Eye,
} from "lucide-react";

const statsQO = queryOptions({ queryKey: ["admin", "content", "stats"], queryFn: () => getContentStats() });
const jobsQO = (type?: string) => queryOptions({
  queryKey: ["admin", "content", "jobs", type ?? "all"],
  queryFn: () => listContentJobs({ data: { type } }),
});

export const Route = createFileRoute("/admin/content")({
  component: ContentDashboard,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

function ContentDashboard() {
  const qc = useQueryClient();
  const { data: stats } = useSuspenseQuery(statsQO);
  const [tab, setTab] = useState<"carousel" | "blog" | "social" | "thumbnail" | "banner">("carousel");
  const [jobFilter, setJobFilter] = useState<string>("");
  const { data: jobs } = useSuspenseQuery(jobsQO(jobFilter || undefined));

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin", "content"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Content Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate carousels, blogs, social posts, thumbnails & banners.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Layers} label="Total Jobs" value={stats.totals.total_jobs || 0} accent />
        <Stat icon={CheckCircle2} label="Completed" value={stats.totals.completed || 0} />
        <Stat icon={IndianRupee} label="Total Cost" value={`$${Number(stats.totals.total_cost || 0).toFixed(2)}`} />
        <Stat icon={AlertCircle} label="Failed" value={stats.totals.failed || 0} warning />
      </div>

      {/* ── Tabs ──────────────────────────────────── */}
      <div className="mt-8 flex gap-1 rounded-xl border border-border/60 bg-card/60 p-1 w-fit">
        {(["carousel", "blog", "social", "thumbnail", "banner"] as const).map((t) => {
          const icons: Record<string, any> = { carousel: Layers, blog: FileText, social: Share2, thumbnail: Image, banner: PanelTop };
          const labels: Record<string, string> = { carousel: "Carousel", blog: "Blog Post", social: "Social Post", thumbnail: "Thumbnail", banner: "Banner" };
          const Ic = icons[t];
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Ic className="h-4 w-4" /> {labels[t]}
            </button>
          );
        })}
      </div>

      {/* ── Generator Forms ───────────────────────── */}
      <div className="mt-6">
        {tab === "carousel" && <CarouselForm onDone={invalidateAll} />}
        {tab === "blog" && <BlogForm onDone={invalidateAll} />}
        {tab === "social" && <SocialForm onDone={invalidateAll} />}
        {tab === "thumbnail" && <ThumbnailForm onDone={invalidateAll} />}
        {tab === "banner" && <BannerForm onDone={invalidateAll} />}
      </div>

      {/* ── Recent Jobs ───────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg font-bold">Recent Jobs</h3>
          <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}
            className="rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs">
            <option value="">All types</option>
            <option value="carousel">Carousel</option>
            <option value="blog_post">Blog Post</option>
            <option value="social_post">Social Post</option>
            <option value="thumbnail">Thumbnail</option>
            <option value="banner">Banner</option>
          </select>
        </div>
        {jobs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">No jobs yet. Generate some content above!</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job: any) => (
              <JobCard key={job.id} job={job} onDelete={() => { deleteContentJob({ data: { id: job.id } }); invalidateAll(); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Carousel Generator ────────────────────────────────
function CarouselForm({ onDone }: { onDone: () => void }) {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(5);
  const [style, setStyle] = useState("educational");
  const [platform, setPlatform] = useState("instagram");
  const [genImages, setGenImages] = useState(false);
  const [result, setResult] = useState<any>(null);
  const mut = useMutation({
    mutationFn: () => generateCarousel({ data: { topic, slide_count: slideCount, style: style as any, platform: platform as any, generate_images: genImages } }),
    onSuccess: (d) => { setResult(d); onDone(); },
  });

  return (
    <div className="rounded-2xl border border-primary/40 bg-card/60 p-6 backdrop-blur-md glow-pink">
      <h3 className="font-display text-lg font-bold">Carousel Generator</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. 5 tips for growing on Instagram"
            className="w-full rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        <Select label="Slides" value={slideCount} onChange={setSlideCount} options={[3, 5, 7, 10]} labels={["3 Slides", "5 Slides", "7 Slides", "10 Slides"]} />
        <Select label="Style" value={style} onChange={setStyle}
          options={["educational", "promotional", "inspirational", "storytelling"]} labels={["Educational", "Promotional", "Inspirational", "Storytelling"]} />
        <Select label="Platform" value={platform} onChange={setPlatform}
          options={["instagram", "linkedin", "facebook"]} labels={["Instagram", "LinkedIn", "Facebook"]} />
        <Toggle label="Generate Images" checked={genImages} onChange={setGenImages} costHint="+$0.003/image" />
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm sm:col-span-2">
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Estimated cost:</span>
          <span className="font-bold">~${(0.05 + (genImages ? slideCount * 0.003 : 0)).toFixed(3)}</span>
        </div>
      </div>
      <GenButton onClick={() => mut.mutate()} loading={mut.isPending} disabled={!topic.trim()} label="Generate Carousel" />
      {mut.isError && <p className="mt-2 text-sm text-destructive">{(mut.error as Error).message}</p>}
      {result && <CarouselPreview data={result.carousel} />}
    </div>
  );
}

function CarouselPreview({ data }: { data: any }) {
  if (!data?.slides) return null;
  return (
    <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">Output — {data.slides.length} slides</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {data.slides.map((s: any, i: number) => (
          <div key={i} className="rounded-lg border border-border/40 bg-background/40 p-3 text-xs">
            <span className="font-bold text-primary">Slide {i + 1}</span>
            <p className="mt-1 line-clamp-2 text-muted-foreground">{s.title || s.text}</p>
            {s.image_url && <img src={s.image_url} alt="" className="mt-2 rounded w-full object-cover h-20" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Blog Post Generator ───────────────────────────────
function BlogForm({ onDone }: { onDone: () => void }) {
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("guide");
  const [wordCount, setWordCount] = useState(800);
  const [genImage, setGenImage] = useState(false);
  const [result, setResult] = useState<any>(null);
  const mut = useMutation({
    mutationFn: () => generateBlogPost({ data: { topic, format: format as any, word_count: wordCount, generate_image: genImage } }),
    onSuccess: (d) => { setResult(d); onDone(); },
  });

  return (
    <div className="rounded-2xl border border-primary/40 bg-card/60 p-6 backdrop-blur-md glow-pink">
      <h3 className="font-display text-lg font-bold">Blog Post Generator</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How to monetize your content creation"
            className="w-full rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        <Select label="Format" value={format} onChange={setFormat}
          options={["guide", "listicle", "story", "how-to", "news"]} labels={["Guide", "Listicle", "Story", "How-To", "News"]} />
        <Select label="Word Count" value={wordCount} onChange={setWordCount}
          options={[500, 800, 1200, 2000]} labels={["~500", "~800", "~1200", "~2000"]} />
        <Toggle label="Featured Image" checked={genImage} onChange={setGenImage} costHint="+$0.003" />
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm">
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Estimated cost:</span>
          <span className="font-bold">~${(0.05 + (genImage ? 0.003 : 0)).toFixed(3)}</span>
        </div>
      </div>
      <GenButton onClick={() => mut.mutate()} loading={mut.isPending} disabled={!topic.trim()} label="Generate Blog Post" />
      {mut.isError && <p className="mt-2 text-sm text-destructive">{(mut.error as Error).message}</p>}
      {result && <BlogPreview data={result.post} />}
    </div>
  );
}

function BlogPreview({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">Output</p>
      <h4 className="font-display font-bold">{data.title}</h4>
      {data.excerpt && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{data.excerpt}</p>}
      {data.content && <p className="mt-2 text-xs text-muted-foreground/70 line-clamp-4 whitespace-pre-wrap">{data.content}</p>}
      {data.featured_image?.url && <img src={data.featured_image.url} alt="" className="mt-3 rounded-lg w-full max-h-48 object-cover" />}
    </div>
  );
}

// ── Social Post Generator ─────────────────────────────
function SocialForm({ onDone }: { onDone: () => void }) {
  const [platform, setPlatform] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("engagement");
  const [genImage, setGenImage] = useState(false);
  const [includeCarousel, setIncludeCarousel] = useState(false);
  const [result, setResult] = useState<any>(null);
  const mut = useMutation({
    mutationFn: () => generateSocialPost({ data: { platform: platform as any, topic, goal: goal as any, generate_image: genImage, include_carousel: includeCarousel } }),
    onSuccess: (d) => { setResult(d); onDone(); },
  });

  return (
    <div className="rounded-2xl border border-primary/40 bg-card/60 p-6 backdrop-blur-md glow-pink">
      <h3 className="font-display text-lg font-bold">Social Post Generator</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select label="Platform" value={platform} onChange={setPlatform}
          options={["instagram", "twitter", "linkedin", "facebook", "youtube"]}
          labels={["Instagram", "Twitter/X", "LinkedIn", "Facebook", "YouTube"]} />
        <Select label="Goal" value={goal} onChange={setGoal}
          options={["engagement", "traffic", "sales", "awareness"]} labels={["Engagement", "Traffic", "Sales", "Awareness"]} />
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Launch of new feature"
            className="w-full rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        <Toggle label="Generate Image" checked={genImage} onChange={setGenImage} costHint="+$0.003" />
        <Toggle label="Include Carousel" checked={includeCarousel} onChange={setIncludeCarousel} />
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm sm:col-span-2">
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Estimated cost:</span>
          <span className="font-bold">~${(0.01 + (genImage ? 0.003 : 0)).toFixed(3)}</span>
        </div>
      </div>
      <GenButton onClick={() => mut.mutate()} loading={mut.isPending} disabled={!topic.trim()} label="Generate Social Post" />
      {mut.isError && <p className="mt-2 text-sm text-destructive">{(mut.error as Error).message}</p>}
      {result && <SocialPreview data={result.post} />}
    </div>
  );
}

function SocialPreview({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">Output</p>
      {data.caption && <p className="text-sm whitespace-pre-wrap">{data.caption}</p>}
      {data.hashtags && <p className="mt-2 text-xs text-primary">{data.hashtags}</p>}
      {data.image_url && <img src={data.image_url} alt="" className="mt-3 rounded-lg w-full max-h-48 object-cover" />}
    </div>
  );
}

// ── Thumbnail Generator ───────────────────────────────
function ThumbnailForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("bold");
  const [result, setResult] = useState<any>(null);
  const mut = useMutation({
    mutationFn: () => generateThumbnail({ data: { title, style: style as any } }),
    onSuccess: (d) => { setResult(d); onDone(); },
  });

  return (
    <div className="rounded-2xl border border-primary/40 bg-card/60 p-6 backdrop-blur-md glow-pink">
      <h3 className="font-display text-lg font-bold">Thumbnail Generator</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 10x Your Income in 30 Days"
            className="w-full rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        <Select label="Style" value={style} onChange={setStyle}
          options={["bold", "clean", "cinematic", "minimal"]} labels={["Bold", "Clean", "Cinematic", "Minimal"]} />
      </div>
      <GenButton onClick={() => mut.mutate()} loading={mut.isPending} disabled={!title.trim()} label="Generate Thumbnail" />
      {mut.isError && <p className="mt-2 text-sm text-destructive">{(mut.error as Error).message}</p>}
      {result?.thumbnail?.image_url && (
        <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Output</p>
          <img src={result.thumbnail.image_url} alt="Thumbnail" className="rounded-lg w-full max-h-64 object-cover" />
        </div>
      )}
    </div>
  );
}

// ── Banner Generator ──────────────────────────────────
function BannerForm({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [purpose, setPurpose] = useState("blog_header");
  const [style, setStyle] = useState("modern");
  const [result, setResult] = useState<any>(null);
  const mut = useMutation({
    mutationFn: () => generateBanner({ data: { text, purpose: purpose as any, style: style as any } }),
    onSuccess: (d) => { setResult(d); onDone(); },
  });

  return (
    <div className="rounded-2xl border border-primary/40 bg-card/60 p-6 backdrop-blur-md glow-pink">
      <h3 className="font-display text-lg font-bold">Banner Generator</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Text</label>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Welcome to the Future of Content"
            className="w-full rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        <Select label="Purpose" value={purpose} onChange={setPurpose}
          options={["blog_header", "social_media", "email", "website"]} labels={["Blog Header", "Social Media", "Email", "Website"]} />
        <Select label="Style" value={style} onChange={setStyle}
          options={["modern", "bold", "elegant", "playful"]} labels={["Modern", "Bold", "Elegant", "Playful"]} />
      </div>
      <GenButton onClick={() => mut.mutate()} loading={mut.isPending} disabled={!text.trim()} label="Generate Banner" />
      {mut.isError && <p className="mt-2 text-sm text-destructive">{(mut.error as Error).message}</p>}
      {result?.banner?.image_url && (
        <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Output</p>
          <img src={result.banner.image_url} alt="Banner" className="rounded-lg w-full max-h-64 object-cover" />
        </div>
      )}
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────
function JobCard({ job, onDelete }: { job: any; onDelete: () => void }) {
  const statusMap: Record<string, { color: string; icon: any }> = {
    completed: { color: "text-green-400 bg-green-400/10", icon: CheckCircle2 },
    failed: { color: "text-red-400 bg-red-400/10", icon: AlertCircle },
    pending: { color: "text-yellow-400 bg-yellow-400/10", icon: Clock },
    generating: { color: "text-purple-400 bg-purple-400/10", icon: Loader2 },
  };
  const s = statusMap[job.status] || statusMap.pending;
  const SIcon = s.icon;
  const isGenerating = job.status === "generating" || job.status === "pending";
  const output = job.output_data ? (typeof job.output_data === "string" ? JSON.parse(job.output_data) : job.output_data) : null;

  const typeLabels: Record<string, string> = {
    carousel: "Carousel", blog_post: "Blog Post", social_post: "Social Post",
    thumbnail: "Thumbnail", banner: "Banner",
  };

  return (
    <div className="group rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-md transition-all hover:border-primary/40 hover:glow-pink">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted-foreground">{typeLabels[job.job_type] || job.job_type}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.color}`}>
          <SIcon className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
          {job.status}
        </span>
      </div>

      {/* Output preview */}
      {output && <OutputPreview type={job.job_type} data={output} />}

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> ${Number(job.total_cost_usd || 0).toFixed(3)}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(job.created_at).toLocaleDateString()}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={onDelete}
          className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </div>
  );
}

function OutputPreview({ type, data }: { type: string; data: any }) {
  if (!data) return null;
  const previewClass = "mt-3 line-clamp-3 text-xs text-muted-foreground/80";

  if (type === "carousel" && data.slides) {
    return (
      <div className="mt-3 flex flex-wrap gap-1">
        {data.slides.slice(0, 3).map((s: any, i: number) => (
          <span key={i} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{s.title || `Slide ${i + 1}`}</span>
        ))}
        {data.slides.length > 3 && <span className="text-[10px] text-muted-foreground">+{data.slides.length - 3} more</span>}
      </div>
    );
  }

  if (type === "blog_post") {
    return <p className={previewClass}>{data.title && <strong>{data.title} — </strong>}{data.excerpt || data.content?.slice(0, 150)}</p>;
  }

  if (type === "social_post") {
    return <p className={previewClass}>{data.caption?.slice(0, 150)}{data.hashtags && <span className="text-primary"> {data.hashtags}</span>}</p>;
  }

  if ((type === "thumbnail" || type === "banner") && data.image_url) {
    return <img src={data.image_url} alt="" className="mt-2 rounded-lg w-full h-24 object-cover" />;
  }

  return null;
}

// ── Reusable Primitives ───────────────────────────────
function Stat({ icon: Icon, label, value, accent, warning }: { icon: any; label: string; value: any; accent?: boolean; warning?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-card/60 p-5 backdrop-blur-md ${accent ? "border-primary/40 glow-pink" : warning ? "border-yellow-500/40" : "border-border/60"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : warning ? "text-yellow-400" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

function Select({ label, value, onChange, options, labels }: {
  label: string; value: any; onChange: (v: any) => void; options: any[]; labels: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => {
        const numVal = Number(e.target.value);
        onChange(isNaN(numVal) ? e.target.value : numVal);
      }}
        className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm">
        {options.map((o, i) => <option key={o} value={o}>{labels[i]}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange, costHint }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; costHint?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-4 py-2.5">
      <div>
        <span className="text-sm">{label}</span>
        {costHint && <span className="ml-2 text-xs text-muted-foreground">{costHint}</span>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function GenButton({ onClick, loading, disabled, label }: { onClick: () => void; loading: boolean; disabled: boolean; label: string }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button onClick={onClick} disabled={disabled || loading}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Zap className="h-4 w-4" /> {label}</>}
      </button>
    </div>
  );
}
