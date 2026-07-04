import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useCallback } from "react";
import {
  generateCarousel,
  generateReelScript,
  generateThumbnail,
  generateStory,
  generateThread,
  generatePoll,
  generateWeeklyPlan,
  getBrandManagerStats,
  listCalendarEntries,
  updateContentStatus,
  getContentQueue,
} from "@/lib/api/brand-manager.functions";
import {
  Sparkles, Image, Film, Layout, MessageSquare, BarChart3,
  Calendar, ChevronLeft, ChevronRight, Loader2, Check, Clock,
  Send, Trash2, Copy, RefreshCw, Zap, Target, Hash, ArrowRight,
  X, Play, Pause, Volume2, Download, Eye, Music, ChevronDown,
  FileText, ExternalLink, Heart, Share2, Bookmark, Wand2, TrendingUp,
  Search, Lightbulb, Trophy, AlertCircle, Repeat, Globe
} from "lucide-react";

export const Route = createFileRoute("/admin/brand-manager")({
  ssr: false,
  component: BrandManagerPage,
});

type Tab = "generators" | "queue" | "calendar" | "stats" | "templates";
type GeneratorType = "carousel" | "reel" | "thumbnail" | "story" | "thread" | "poll";
type ProviderChoice = "premium" | "free";

function BrandManagerPage() {
  const [tab, setTab] = useState<Tab>("generators");
  const [activeGen, setActiveGen] = useState<GeneratorType>("carousel");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<ProviderChoice>("free");
  const [detailItem, setDetailItem] = useState<any>(null);
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [seoData, setSeoData] = useState<any>(null);
  const [showRepurpose, setShowRepurpose] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Form states
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState(7);
  const [duration, setDuration] = useState<"15s" | "30s" | "60s" | "90s">("30s");
  const [platform, setPlatform] = useState<"twitter" | "linkedin">("twitter");
  const [style, setStyle] = useState("educational");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const getStats = useServerFn(getBrandManagerStats);
  const getQueue = useServerFn(getContentQueue);
  const getCalendar = useServerFn(listCalendarEntries);
  const updateStatus = useServerFn(updateContentStatus);

  const generators: { type: GeneratorType; label: string; icon: any; desc: string }[] = [
    { type: "carousel", label: "Carousel", icon: Layout, desc: "Multi-slide Instagram post" },
    { type: "reel", label: "Reel Script", icon: Film, desc: "Video script with scenes" },
    { type: "thumbnail", label: "Thumbnail", icon: Image, desc: "Eye-catching cover image" },
    { type: "story", label: "Story", icon: Sparkles, desc: "Instagram story sequence" },
    { type: "thread", label: "Thread", icon: MessageSquare, desc: "Twitter/LinkedIn thread" },
    { type: "poll", label: "Poll", icon: Hash, desc: "Engaging poll question" },
  ];

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setQualityScore(null);
    setSeoData(null);

    const providerName = provider === "premium" ? "Gemini 2.5 Pro" : "Gemini Flash";
    const genLabel = generators.find(g => g.type === activeGen)?.label || activeGen;

    try {
      setStatus(`Generating ${genLabel.toLowerCase()} with ${providerName}...`);
      let res;
      switch (activeGen) {
        case "carousel":
          res = await generateCarousel({ data: { topic, slides, style: style as any, provider } });
          break;
        case "reel":
          res = await generateReelScript({ data: { topic, duration, style: style as any, provider } });
          break;
        case "thumbnail":
          res = await generateThumbnail({ data: { title: topic, style: style as any, provider } });
          break;
        case "story":
          res = await generateStory({ data: { topic, slides: 3, provider } });
          break;
        case "thread":
          res = await generateThread({ data: { topic, platform, tweets: 5, provider } });
          break;
        case "poll":
          res = await generatePoll({ data: { topic, platform: platform as any, provider } });
          break;
      }

      const content = (res as any)?.content || res;
      setResult(content);
      setStatus(`Done! Generated with ${providerName}`);
    } catch (err: any) {
      setError(err.message || "Generation failed");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 p-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Brand Manager</h1>
            <p className="text-sm text-muted-foreground">Premium content generation with SEO, quality scoring & repurposing</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-muted/80"
          >
            <Lightbulb className="h-4 w-4" /> Templates
          </button>
          {result && (
            <button
              onClick={() => setShowRepurpose(!showRepurpose)}
              className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
            >
              <Repeat className="h-4 w-4" /> Repurpose
            </button>
          )}
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <TemplatesPanel onSelect={(template) => {
          setSelectedTemplate(template.id);
          setTopic(template.topics[0]);
          setStyle(template.style);
          setShowTemplates(false);
        }} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
        {(["generators", "queue", "calendar", "stats"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "generators" ? "Content Studio" : t === "queue" ? "Approval Queue" : t === "calendar" ? "Calendar" : "Analytics"}
          </button>
        ))}
      </div>

      {/* Generators Tab */}
      {tab === "generators" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Generator Selector */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Content Type</h3>
            {generators.map((g) => (
              <button
                key={g.type}
                onClick={() => { setActiveGen(g.type); setResult(null); setError(""); setQualityScore(null); }}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                  activeGen === g.type
                    ? "bg-primary/10 text-foreground border border-primary/30"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <g.icon className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">{g.label}</p>
                  <p className="text-xs opacity-60">{g.desc}</p>
                </div>
              </button>
            ))}

            {/* Provider Toggle */}
            <div className="space-y-2 pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground">AI Model</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setProvider("free")}
                  className={`flex w-full items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                    provider === "free"
                      ? "border-green-500/50 bg-green-500/10 text-green-600"
                      : "border-border/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">Gemini Flash</p>
                    <p className="text-[10px] opacity-60">Free — Good quality</p>
                  </div>
                </button>
                <button
                  onClick={() => setProvider("premium")}
                  className={`flex w-full items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                    provider === "premium"
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-600"
                      : "border-border/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">Gemini Pro</p>
                    <p className="text-[10px] opacity-60">Free — Premium quality</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Generator Form + Result */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                {generators.find(g => g.type === activeGen)?.icon && 
                  (() => { const Icon = generators.find(g => g.type === activeGen)!.icon; return <Icon className="h-4 w-4" />; })()}
                Generate {generators.find(g => g.type === activeGen)?.label}
              </h3>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Topic *</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. 5 ways to grow your Poppo Live audience"
                  className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm focus:border-primary focus:outline-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {activeGen === "carousel" && (
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Slides</label>
                    <input type="number" value={slides} onChange={e => setSlides(+e.target.value)} min={3} max={10}
                      className="w-full rounded-lg border border-border/60 bg-background p-2 text-sm" />
                  </div>
                )}
                {activeGen === "reel" && (
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Duration</label>
                    <select value={duration} onChange={e => setDuration(e.target.value as any)}
                      className="w-full rounded-lg border border-border/60 bg-background p-2 text-sm">
                      <option value="15s">15 seconds</option>
                      <option value="30s">30 seconds</option>
                      <option value="60s">60 seconds</option>
                      <option value="90s">90 seconds</option>
                    </select>
                  </div>
                )}
                {(activeGen === "thread" || activeGen === "poll") && (
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Platform</label>
                    <select value={platform} onChange={e => setPlatform(e.target.value as any)}
                      className="w-full rounded-lg border border-border/60 bg-background p-2 text-sm">
                      <option value="twitter">Twitter</option>
                      <option value="linkedin">LinkedIn</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Style</label>
                  <select value={style} onChange={e => setStyle(e.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-background p-2 text-sm">
                    <option value="educational">Educational</option>
                    <option value="storytelling">Storytelling</option>
                    <option value="listicle">Listicle</option>
                    <option value="tips">Tips</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50 ${
                  provider === "premium"
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                }`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {loading ? "Generating..." : provider === "premium" ? "Generate with Gemini Pro" : "Generate with Gemini Flash"}
              </button>

              {status && (
                <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                  status.startsWith("Done") ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                }`}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : status.startsWith("Done") ? <Check className="h-4 w-4 shrink-0" /> : null}
                  <span>{status}</span>
                </div>
              )}

              {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            </div>

            {/* Result Display */}
            {result && (
              <ContentPreview
                content={result}
                type={activeGen}
                onImprove={async (instruction) => {
                  // TODO: Wire to improveContent
                  alert("AI Improve: " + instruction);
                }}
                onRegenerate={handleGenerate}
              />
            )}

            {/* Repurpose Panel */}
            {showRepurpose && result && (
              <RepurposePanel
                content={JSON.stringify(result)}
                title={result.title || topic}
                source_type={activeGen}
                topic={topic}
              />
            )}
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {tab === "queue" && <QueueTab onViewDetail={setDetailItem} />}

      {/* Calendar Tab */}
      {tab === "calendar" && <CalendarTab />}

      {/* Stats Tab */}
      {tab === "stats" && <StatsTab getStats={getStats} />}

      {/* Content Detail Drawer */}
      {detailItem && (
        <ContentDetailDrawer item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  );
}

// ── Content Preview Component ───────────────────────────

function ContentPreview({ content, type, onImprove, onRegenerate }: {
  content: any;
  type: GeneratorType;
  onImprove: (instruction: string) => void;
  onRegenerate: () => void;
}) {
  if (!content) return null;
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showImprove, setShowImprove] = useState(false);
  const [improveInstruction, setImproveInstruction] = useState("");

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary flex items-center gap-2">
          <Check className="h-4 w-4" /> Generated Content
        </h3>
        <div className="flex items-center gap-2">
          {content.music?.track && (
            <span className="flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-600">
              <Music className="h-3 w-3" /> {content.music.track.title}
            </span>
          )}
          <button onClick={() => navigator.clipboard.writeText(JSON.stringify(content, null, 2))}
            className="rounded-lg bg-muted px-2 py-1 text-xs hover:bg-muted/80">
            <Copy className="h-3 w-3 inline mr-1" /> Copy
          </button>
        </div>
      </div>

      {/* Carousel Preview */}
      {type === "carousel" && content.slides && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">{content.title}</h4>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {content.slides.map((slide: any, i: number) => (
              <div key={i} className="min-w-[200px] rounded-xl border border-border/60 bg-background overflow-hidden">
                {slide.image_url && (
                  <img src={slide.image_url} alt={slide.headline} className="h-40 w-full object-cover" />
                )}
                <div className="p-3 space-y-1">
                  <p className="text-xs font-bold line-clamp-2">{slide.headline}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-3">{slide.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{content.caption}</p>
          <div className="flex flex-wrap gap-1">
            {content.hashtags?.map((tag: string, i: number) => (
              <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">#{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Reel Script Preview */}
      {type === "reel" && content.scenes && (
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-600 font-medium">Hook: {content.hook}</div>
          <div className="space-y-2">
            {content.scenes.map((scene: any, i: number) => (
              <div key={i} className="flex gap-3 rounded-lg border border-border/60 bg-background p-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</div>
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] text-muted-foreground">{scene.duration}</p>
                  <p className="text-xs font-medium">{scene.visual}</p>
                  <p className="text-xs text-blue-500">{scene.audio}</p>
                  {scene.text_overlay && <p className="text-[10px] bg-muted rounded px-2 py-1">{scene.text_overlay}</p>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{content.caption}</p>
        </div>
      )}

      {/* Story Preview */}
      {type === "story" && content.slides && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {content.slides.map((slide: any, i: number) => (
            <div key={i} className="min-w-[160px] rounded-xl border border-border/60 bg-background overflow-hidden">
              {slide.image_url && <img src={slide.image_url} alt="" className="h-48 w-full object-cover" />}
              <div className="p-3 space-y-1">
                <p className="text-xs font-medium line-clamp-3">{slide.text}</p>
                {slide.cta && <p className="text-[10px] text-primary font-medium">{slide.cta}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Thread Preview */}
      {type === "thread" && content.tweets && (
        <div className="space-y-2">
          {content.tweets.map((tweet: string, i: number) => (
            <div key={i} className="rounded-lg border border-border/60 bg-background p-3">
              <p className="text-xs text-muted-foreground mb-1">Tweet {i + 1}/{content.tweets.length}</p>
              <p className="text-sm">{tweet}</p>
            </div>
          ))}
        </div>
      )}

      {/* Poll Preview */}
      {type === "poll" && content.question && (
        <div className="rounded-lg border border-border/60 bg-background p-4 space-y-3">
          <p className="font-medium">{content.question}</p>
          {content.options?.map((opt: string, i: number) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
              <div className="h-4 w-4 rounded-full border-2 border-primary/30" />
              <span className="text-sm">{opt}</span>
            </div>
          ))}
        </div>
      )}

      {/* Thumbnail Preview */}
      {type === "thumbnail" && content.image_url && (
        <div className="space-y-2">
          <img src={content.image_url} alt="Thumbnail" className="w-full rounded-lg" />
          <p className="text-xs text-muted-foreground">{content.image_prompt}</p>
        </div>
      )}

      {/* Audio Player */}
      {content.audio?.full?.audioUrl && (
        <div className="rounded-lg bg-muted/50 p-3">
          <AudioPlayer url={content.audio.full.audioUrl} />
        </div>
      )}

      {/* AI Improve Bar */}
      <div className="flex gap-2 pt-2 border-t border-border/60">
        <input
          value={improveInstruction}
          onChange={(e) => setImproveInstruction(e.target.value)}
          placeholder="e.g. Make it funnier, add more hooks, shorten..."
          className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter" && improveInstruction.trim()) { onImprove(improveInstruction); setImproveInstruction(""); } }}
        />
        <button
          onClick={() => { if (improveInstruction.trim()) { onImprove(improveInstruction); setImproveInstruction(""); } }}
          disabled={!improveInstruction.trim()}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Wand2 className="h-4 w-4" /> Improve
        </button>
        <button onClick={onRegenerate}
          className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-muted/80">
          <RefreshCw className="h-4 w-4" /> Regenerate
        </button>
      </div>
    </div>
  );
}

// ── Templates Panel ─────────────────────────────────────

function TemplatesPanel({ onSelect }: { onSelect: (template: any) => void }) {
  const templates = [
    { id: "growth", name: "30-Day Growth Sprint", desc: "Educational carousels to grow followers", icon: TrendingUp, color: "text-green-500" },
    { id: "engagement", name: "Engagement Booster", desc: "Polls, questions, interactive content", icon: Heart, color: "text-pink-500" },
    { id: "sales", name: "Success Stories", desc: "Testimonials and earnings showcases", icon: Trophy, color: "text-amber-500" },
    { id: "brand", name: "Industry Authority", desc: "Tips, insights, thought leadership", icon: Lightbulb, color: "text-blue-500" },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Content Templates</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {templates.map((t) => (
          <button key={t.id} onClick={() => onSelect(t)}
            className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-left hover:bg-muted/50 transition-all">
            <t.icon className={`h-5 w-5 ${t.color}`} />
            <div>
              <p className="text-xs font-medium">{t.name}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Repurpose Panel ─────────────────────────────────────

function RepurposePanel({ content, title, source_type, topic }: {
  content: string;
  title: string;
  source_type: string;
  topic: string;
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const formats = [
    { id: "carousel", label: "Carousel", icon: Layout },
    { id: "reel", label: "Reel Script", icon: Film },
    { id: "story", label: "Story", icon: Sparkles },
    { id: "thread", label: "Thread", icon: MessageSquare },
    { id: "social_post", label: "Social Post", icon: Globe },
  ];

  const handleRepurpose = async (format: string) => {
    setLoading(true);
    try {
      // TODO: Wire to actual repurpose API
      alert(`Repurposing to ${format}... Coming soon!`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2 text-purple-600">
        <Repeat className="h-4 w-4" /> Repurpose Content
      </h3>
      <p className="text-xs text-muted-foreground">Turn this {source_type} into other formats</p>
      <div className="flex gap-2 flex-wrap">
        {formats.map((f) => (
          <button key={f.id} onClick={() => handleRepurpose(f.id)} disabled={loading}
            className="flex items-center gap-1 rounded-lg bg-background border border-border/60 px-3 py-2 text-xs hover:bg-muted/50 disabled:opacity-50">
            <f.icon className="h-3 w-3" /> {f.label}
          </button>
        ))}
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

// ── Queue Tab ──────────────────────────────────────────

function QueueTab({ onViewDetail }: { onViewDetail: (item: any) => void }) {
  const getQueue = useServerFn(getContentQueue);
  const updateStatus = useServerFn(updateContentStatus);
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("");

  const loadQueue = useCallback(async () => {
    const res = await getQueue({ data: { status: filter || undefined } });
    setItems((res as any) || []);
  }, [filter]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const getTypeIcon = (type: string) => {
    const map: Record<string, any> = { carousel: Layout, reel_script: Film, thumbnail: Image, story: Sparkles, thread: MessageSquare, poll: Hash, blog_post: FileText, social_post: MessageSquare };
    return map[type] || FileText;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-lg border border-border/60 bg-background p-2 text-sm">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
        </select>
        <button onClick={loadQueue} className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-muted/80">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="space-y-2">
        {items.length === 0 && <p className="text-center text-muted-foreground py-8">No content in queue.</p>}
        {items.map((item) => {
          const TypeIcon = getTypeIcon(item.job_type);
          return (
            <div key={item.id}
              className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/50 p-4 hover:bg-card/80 cursor-pointer transition-all"
              onClick={() => onViewDetail(item)}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TypeIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title || item.job_type.replace(/_/g, " ").toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">{item.status} — {new Date(item.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {item.status === "draft" && (
                    <button onClick={async () => { await updateStatus({ data: { id: item.id, status: "approved" } }); loadQueue(); }}
                      className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs text-green-600 hover:bg-green-500/20">
                      <Check className="h-3 w-3 inline mr-1" /> Approve
                    </button>
                  )}
                  {item.status === "approved" && (
                    <button onClick={async () => { await updateStatus({ data: { id: item.id, status: "published" } }); loadQueue(); }}
                      className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-500/20">
                      <Send className="h-3 w-3 inline mr-1" /> Publish
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Content Detail Drawer ───────────────────────────────

function ContentDetailDrawer({ item, onClose }: { item: any; onClose: () => void }) {
  const outputData = item.output_data || {};
  const [activeSlide, setActiveSlide] = useState(0);

  const getTypeIcon = (type: string) => {
    const map: Record<string, any> = { carousel: Layout, reel_script: Film, thumbnail: Image, story: Sparkles, thread: MessageSquare, poll: Hash };
    return map[type] || FileText;
  };
  const TypeIcon = getTypeIcon(item.job_type);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-2xl bg-background shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 backdrop-blur p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TypeIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{item.title || item.job_type.replace(/_/g, " ").toUpperCase()}</h2>
              <p className="text-xs text-muted-foreground">{item.status} — {new Date(item.created_at).toLocaleString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg bg-muted p-2 hover:bg-muted/80"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Carousel Detail */}
          {item.job_type === "carousel" && outputData.slides && (
            <div className="space-y-4">
              <h3 className="font-medium">{outputData.title}</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {outputData.slides.map((_: any, i: number) => (
                  <button key={i} onClick={() => setActiveSlide(i)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      activeSlide === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>Slide {i + 1}</button>
                ))}
              </div>
              {outputData.slides[activeSlide] && (
                <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
                  {outputData.slides[activeSlide].image_url && (
                    <img src={outputData.slides[activeSlide].image_url} alt="" className="h-64 w-full object-cover" />
                  )}
                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-lg">{outputData.slides[activeSlide].headline}</h4>
                    <p className="text-sm text-muted-foreground">{outputData.slides[activeSlide].body}</p>
                  </div>
                </div>
              )}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm">{outputData.caption}</p>
                <div className="flex flex-wrap gap-1">
                  {outputData.hashtags?.map((tag: string, i: number) => (
                    <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">#{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reel Detail */}
          {item.job_type === "reel_script" && outputData.scenes && (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 font-medium">Hook: {outputData.hook}</div>
              {outputData.scenes.map((scene: any, i: number) => (
                <div key={i} className="flex gap-3 rounded-xl border border-border/60 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground">{scene.duration}</p>
                    <p className="text-sm font-medium">{scene.visual}</p>
                    <p className="text-sm text-blue-500">Audio: {scene.audio}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Story Detail */}
          {item.job_type === "story" && outputData.slides && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {outputData.slides.map((slide: any, i: number) => (
                <div key={i} className="min-w-[200px] rounded-xl border border-border/60 overflow-hidden">
                  {slide.image_url && <img src={slide.image_url} alt="" className="h-56 w-full object-cover" />}
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-medium">{slide.text}</p>
                    {slide.cta && <p className="text-[10px] text-primary font-medium">{slide.cta}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Thread Detail */}
          {item.job_type === "thread" && outputData.tweets && (
            <div className="space-y-3">
              {outputData.tweets.map((tweet: string, i: number) => (
                <div key={i} className="rounded-xl border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground mb-2">Tweet {i + 1}/{outputData.tweets.length}</p>
                  <p className="text-sm">{tweet}</p>
                </div>
              ))}
            </div>
          )}

          {/* Poll Detail */}
          {item.job_type === "poll" && outputData.question && (
            <div className="space-y-3">
              <h3 className="font-medium text-lg">{outputData.question}</h3>
              {outputData.options?.map((opt: string, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 p-4">
                  <div className="h-5 w-5 rounded-full border-2 border-primary/30" />
                  <span className="text-sm">{opt}</span>
                </div>
              ))}
            </div>
          )}

          {/* Audio */}
          {outputData.audio?.full?.audioUrl && (
            <div className="rounded-lg bg-muted/50 p-4">
              <AudioPlayer url={outputData.audio.full.audioUrl} />
            </div>
          )}

          {/* Music */}
          {outputData.music?.track && (
            <div className="flex items-center gap-3 rounded-lg bg-purple-500/10 p-4">
              <Music className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">{outputData.music.track.title}</p>
                <p className="text-xs text-muted-foreground">{outputData.music.reason}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>Job ID</span><span className="font-mono">{item.id.slice(0, 8)}...</span></div>
            <div className="flex justify-between"><span>Cost</span><span>${(item.total_cost_usd || 0).toFixed(4)}</span></div>
            <div className="flex justify-between"><span>Created</span><span>{new Date(item.created_at).toLocaleString()}</span></div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(outputData, null, 2))}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm hover:bg-muted/80">
              <Copy className="h-4 w-4" /> Copy JSON
            </button>
            <button onClick={() => {
              const blob = new Blob([JSON.stringify(outputData, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `${item.job_type}_${Date.now()}.json`; a.click();
            }} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm hover:bg-muted/80">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Tab ───────────────────────────────────────

function CalendarTab() {
  const getCalendar = useServerFn(listCalendarEntries);
  const genPlan = useServerFn(generateWeeklyPlan);
  const [entries, setEntries] = useState<any[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [generating, setGenerating] = useState(false);

  const loadCalendar = useCallback(async () => {
    const now = new Date();
    now.setDate(now.getDate() + weekOffset * 7);
    const from = new Date(now);
    from.setDate(from.getDate() - from.getDay() + 1);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    const res = await getCalendar({ data: { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] } });
    setEntries((res as any) || []);
  }, [weekOffset]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const handleGenerateWeek = async () => {
    setGenerating(true);
    try { await genPlan({ data: {} }); await loadCalendar(); } finally { setGenerating(false); }
  };

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const now = new Date();
  now.setDate(now.getDate() + weekOffset * 7);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="rounded-lg bg-muted p-2 hover:bg-muted/80"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium">Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="rounded-lg bg-muted p-2 hover:bg-muted/80"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <button onClick={handleGenerateWeek} disabled={generating}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating..." : "Generate Weekly Plan"}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split("T")[0];
          const dayEntries = entries.filter(e => e.date === dateStr);
          return (
            <div key={day} className="rounded-xl border border-border/60 bg-card/50 p-3 min-h-[120px]">
              <p className="text-xs font-semibold text-muted-foreground mb-2">{day} {date.getDate()}</p>
              <div className="space-y-1">
                {dayEntries.map((e, j) => (
                  <div key={j} className="rounded-lg bg-primary/10 p-1.5 text-[10px]">
                    <p className="font-medium truncate">{e.content_type}</p>
                    <p className="text-muted-foreground truncate">{e.platform}</p>
                  </div>
                ))}
                {dayEntries.length === 0 && <p className="text-[10px] text-muted-foreground/50 italic">No content</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stats Tab ──────────────────────────────────────────

function StatsTab({ getStats }: { getStats: any }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { getStats().then((res: any) => setStats(res || null)); }, []);

  if (!stats) return <p className="text-muted-foreground">Loading stats...</p>;
  const s = stats.totals || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Total Content", value: s.total_content || 0, icon: Sparkles, color: "text-pink-500" },
          { label: "Drafts", value: s.drafts || 0, icon: Clock, color: "text-yellow-500" },
          { label: "Approved", value: s.approved || 0, icon: Check, color: "text-green-500" },
          { label: "Published", value: s.published || 0, icon: Send, color: "text-blue-500" },
          { label: "Total Cost", value: `$${(s.total_cost || 0).toFixed(2)}`, icon: Target, color: "text-purple-500" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border/60 bg-card/50 p-4">
            <card.icon className={`h-5 w-5 ${card.color} mb-2`} />
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>
      {stats.byType?.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-5">
          <h3 className="font-semibold mb-3">Content by Type</h3>
          <div className="space-y-2">
            {stats.byType.map((t: any) => (
              <div key={t.job_type} className="flex items-center justify-between">
                <span className="text-sm">{t.job_type.replace(/_/g, " ")}</span>
                <span className="text-sm font-medium">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
