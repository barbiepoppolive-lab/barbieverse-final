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
  updateContentOutput,
  getContentQueue,
  improveContent as improveContentFn,
  quickRepurpose as quickRepurposeFn,
  generateContentSEO as generateContentSEOFn,
  scoreContent as scoreContentFn,
} from "@/lib/api/brand-manager.functions";
import {
  generateVideoScript as generateVideoScriptFn,
  generateVideo as generateVideoFn,
  generateVoice as generateVoiceFn,
  generateFullVideo as generateFullVideoFn,
  getVideoGenStatus as getVideoGenStatusFn,
} from "@/lib/api/video-gen.functions";
import {
  generateMediaAgent,
  executeSkillCommand,
} from "@/lib/api/media-agent.functions";
import {
  getCostDashboard as getCostDashboardFn,
  updateBudgetConfig as updateBudgetConfigFn,
  refreshModels as refreshModelsFn,
} from "@/lib/api/cost-monitor.functions";
import {
  generateBlogPost,
  generateSocialPost,
  listContentJobs,
  getContentStats,
  deleteContentJob,
} from "@/lib/api/content-ai.functions";
import {
  Sparkles, Image, Film, Layout, MessageSquare, BarChart3,
  Calendar, ChevronLeft, ChevronRight, Loader2, Check, Clock,
  Send, Trash2, Copy, RefreshCw, Zap, Target, Hash, ArrowRight,
  X, Play, Pause, Volume2, Download, Eye, Music, ChevronDown,
  FileText, ExternalLink, Heart, Share2, Bookmark, Wand2, TrendingUp,
  Search, Lightbulb, Trophy, AlertCircle, Repeat, Globe, Video, Activity
} from "lucide-react";

export const Route = createFileRoute("/admin/brand-manager")({
  ssr: false,
  component: BrandManagerPage,
});

type Tab = "generators" | "video" | "content" | "queue" | "calendar" | "stats" | "templates" | "costs";
type GeneratorType = "carousel" | "reel" | "thumbnail" | "story" | "thread" | "poll";
type ProviderChoice = "premium" | "free" | "media-agent";

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
  const [videoTopic, setVideoTopic] = useState("");
  const [videoDuration, setVideoDuration] = useState<"15" | "30" | "60">("30");
  const [videoPlatform, setVideoPlatform] = useState<"youtube" | "instagram" | "tiktok">("youtube");
  const [videoStyle, setVideoStyle] = useState<"educational" | "entertaining" | "promotional">("educational");
  const [videoResult, setVideoResult] = useState<any>(null);
  const [skillCommand, setSkillCommand] = useState("");
  const [mediaAgentResult, setMediaAgentResult] = useState<any>(null);
  const [costDashboard, setCostDashboard] = useState<any>(null);

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
  const improveServer = useServerFn(improveContentFn);
  const repurposeServer = useServerFn(quickRepurposeFn);
  const seoServer = useServerFn(generateContentSEOFn);
  const scoreServer = useServerFn(scoreContentFn);
  const videoScriptServer = useServerFn(generateVideoScriptFn);
  const videoServer = useServerFn(generateVideoFn);
  const voiceServer = useServerFn(generateVoiceFn);
  const fullVideoServer = useServerFn(generateFullVideoFn);
  const mediaAgentServer = useServerFn(generateMediaAgent);
  const skillServer = useServerFn(executeSkillCommand);
  const costDashboardServer = useServerFn(getCostDashboardFn);
  const refreshModelsServer = useServerFn(refreshModelsFn);

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
    setMediaAgentResult(null);

    const providerLabel = provider === "media-agent" ? "Media Agent" : provider === "premium" ? "Gemini 2.5 Pro" : "Gemini Flash";
    const genLabel = generators.find(g => g.type === activeGen)?.label || activeGen;

    try {
      setStatus(`Generating ${genLabel.toLowerCase()} with ${providerLabel}...`);
      let res;

      if (provider === "media-agent") {
        // Media Agent pipeline — full 7-agent orchestration
        const pipelineMap: Record<GeneratorType, string> = {
          carousel: "carousel",
          reel: "reel",
          thumbnail: "reel",
          story: "story",
          thread: "thread",
          poll: "post",
        };
        res = await mediaAgentServer({
          data: {
            topic,
            pipeline: (pipelineMap[activeGen] || "reel") as any,
            platform: activeGen === "thread" || activeGen === "poll" ? (platform === "linkedin" ? "linkedin" : "twitter") : "instagram",
            with_video: false,
            with_image: true,
            quality_threshold: 70,
            style,
          },
        });
        const agentResult = (res as any)?.content || res;
        setMediaAgentResult(agentResult);
        setResult(agentResult.content);
      } else {
        // Standard free/premium generation
        const stdProvider = (provider === "premium" ? "premium" : "free") as "free" | "premium";
        switch (activeGen) {
          case "carousel":
            res = await generateCarousel({ data: { topic, slides, style: style as any, provider: stdProvider } });
            break;
          case "reel":
            res = await generateReelScript({ data: { topic, duration, style: style as any, provider: stdProvider } });
            break;
          case "thumbnail":
            res = await generateThumbnail({ data: { title: topic, style: style as any, provider: stdProvider } });
            break;
          case "story":
            res = await generateStory({ data: { topic, slides: 3, provider: stdProvider } });
            break;
          case "thread":
            res = await generateThread({ data: { topic, platform, tweets: 5, provider: stdProvider } });
            break;
          case "poll":
            res = await generatePoll({ data: { topic, platform: platform as any, provider: stdProvider } });
            break;
        }
        const content = (res as any)?.content || res;
        setResult(content);
      }

      setStatus(`Done! Generated with ${providerLabel}`);
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
        {(["generators", "video", "content", "queue", "calendar", "stats", "costs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "costs" && !costDashboard) {
                costDashboardServer({}).then(setCostDashboard).catch(console.error);
              }
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "generators" ? "Content Studio" : t === "video" ? "Video Studio" : t === "content" ? "Blog & Social" : t === "queue" ? "Approval Queue" : t === "calendar" ? "Calendar" : t === "costs" ? "Cost Monitor" : "Analytics"}
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
                <button
                  onClick={() => setProvider("media-agent")}
                  className={`flex w-full items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                    provider === "media-agent"
                      ? "border-purple-500/50 bg-purple-500/10 text-purple-600"
                      : "border-border/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Wand2 className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">Media Agent</p>
                    <p className="text-[10px] opacity-60">Full pipeline — Hook + Content + Visual + QA</p>
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

              {/* Skill Command Input (Media Agent only) */}
              {provider === "media-agent" && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Quick Command (optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillCommand}
                      onChange={(e) => setSkillCommand(e.target.value)}
                      placeholder="/reel 5 side hustles for college students"
                      className="flex-1 rounded-lg border border-purple-500/30 bg-background p-3 text-sm focus:border-purple-500 focus:outline-none font-mono"
                    />
                    <button
                      onClick={async () => {
                        if (!skillCommand.trim()) return;
                        setLoading(true);
                        setError("");
                        setMediaAgentResult(null);
                        setResult(null);
                        try {
                          setStatus("Running skill command...");
                          const res = await skillServer({ data: { command: skillCommand } });
                          setMediaAgentResult(res);
                          setResult((res as any)?.content);
                          setStatus("Skill executed!");
                        } catch (e: any) {
                          setError(e?.message || "Skill failed");
                          setStatus("");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading || !skillCommand.trim()}
                      className="rounded-lg bg-purple-500 px-4 py-3 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
                    >
                      Run
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Commands: /reel /carousel /story /post /thread /poll /moj /facebook /reddit /recruit /month /audit
                  </p>
                </div>
              )}

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
                  provider === "media-agent"
                    ? "bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700"
                    : provider === "premium"
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                }`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : provider === "media-agent" ? <Wand2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                {loading ? "Generating..." : provider === "media-agent" ? "Run Media Agent" : provider === "premium" ? "Generate with Gemini Pro" : "Generate with Gemini Flash"}
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

            {/* Media Agent Result — Quality Score + Visual Prompt + Hooks */}
            {mediaAgentResult && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-purple-600">
                  <Wand2 className="h-4 w-4" /> Media Agent Pipeline Complete
                </div>

                {/* Quality Score */}
                {mediaAgentResult.quality && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-background/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Quality Score</span>
                        <span className={`text-lg font-bold ${
                          mediaAgentResult.quality.overall >= 70 ? "text-green-600" :
                          mediaAgentResult.quality.overall >= 50 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {mediaAgentResult.quality.overall}/100
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            mediaAgentResult.quality.overall >= 70 ? "bg-green-500" :
                            mediaAgentResult.quality.overall >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${mediaAgentResult.quality.overall}%` }}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg bg-background/50 p-3">
                      <span className="text-xs text-muted-foreground">Verdict</span>
                      <p className={`mt-1 text-sm font-semibold ${
                        mediaAgentResult.quality.verdict === "pass" ? "text-green-600" :
                        mediaAgentResult.quality.verdict === "revise" ? "text-amber-600" : "text-red-600"
                      }`}>
                        {mediaAgentResult.quality.verdict === "pass" ? "✓ Passed" :
                         mediaAgentResult.quality.verdict === "revise" ? "⚠ Needs Revision" : "✕ Rejected"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {mediaAgentResult.revisions} revision{mediaAgentResult.revisions !== 1 ? "s" : ""} • ${mediaAgentResult.estimated_cost?.toFixed(3) || "0.000"} cost
                      </p>
                    </div>
                  </div>
                )}

                {/* Dimension Scores */}
                {mediaAgentResult.quality?.dimensions && (
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(mediaAgentResult.quality.dimensions).map(([key, val]) => (
                      <div key={key} className="rounded bg-background/30 px-2 py-1">
                        <span className="text-[10px] text-muted-foreground">{key.replace(/_/g, " ")}</span>
                        <span className={`ml-1 text-xs font-medium ${(val as number) >= 70 ? "text-green-600" : (val as number) >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {val as number}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hook Display */}
                {mediaAgentResult.hook && (
                  <div className="rounded-lg bg-background/50 p-3">
                    <span className="text-xs text-muted-foreground">Hook</span>
                    <p className="mt-1 text-sm font-medium">"{mediaAgentResult.hook}"</p>
                    {mediaAgentResult.hook_variants?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[10px] text-muted-foreground">A/B Variants:</span>
                        {mediaAgentResult.hook_variants.map((h: string, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">"{h}"</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Visual Prompt */}
                {mediaAgentResult.visual_prompt && (
                  <div className="rounded-lg bg-background/50 p-3">
                    <span className="text-xs text-muted-foreground">Visual Prompt</span>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{mediaAgentResult.visual_prompt}</p>
                  </div>
                )}

                {/* Image */}
                {mediaAgentResult.image_url && (
                  <div className="rounded-lg overflow-hidden">
                    <img src={mediaAgentResult.image_url} alt="Generated" className="w-full max-h-64 object-cover" />
                  </div>
                )}

                {/* Agents Used */}
                {mediaAgentResult.agents_used?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {mediaAgentResult.agents_used.map((agent: string) => (
                      <span key={agent} className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-600">
                        {agent}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Result Display */}
            {result && (
              <ContentPreview
                content={result}
                type={activeGen}
                onImprove={async (instruction) => {
                  if (!result) return;
                  try {
                    setStatus("Improving content with AI...");
                    const contentStr = JSON.stringify(result);
                    const improved = await improveServer({ data: { content: contentStr, instruction, content_type: activeGen } });
                    setResult((improved as any)?.improvedContent || result);
                    setStatus("Content improved!");
                  } catch (e: any) {
                    setError("Improve failed: " + (e?.message || "Unknown error"));
                  }
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

      {/* Video Tab */}
      {tab === "video" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Video Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Video Generation</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Video topic..."
                value={videoTopic}
                onChange={(e) => setVideoTopic(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(e.target.value as any)}
                  className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                >
                  <option value="15">15s</option>
                  <option value="30">30s</option>
                  <option value="60">60s</option>
                </select>
                <select
                  value={videoPlatform}
                  onChange={(e) => setVideoPlatform(e.target.value as any)}
                  className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                >
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                </select>
                <select
                  value={videoStyle}
                  onChange={(e) => setVideoStyle(e.target.value as any)}
                  className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                >
                  <option value="educational">Educational</option>
                  <option value="entertaining">Entertaining</option>
                  <option value="promotional">Promotional</option>
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!videoTopic.trim()) return;
                  setLoading(true);
                  setError("");
                  setVideoResult(null);
                  try {
                    setStatus("Generating video script...");
                    const res = await fullVideoServer({
                      data: {
                        topic: videoTopic,
                        duration: videoDuration,
                        platform: videoPlatform,
                        style: videoStyle,
                        withVoiceover: true,
                      },
                    });
                    setVideoResult(res);
                    setStatus("Video generated!");
                  } catch (e: any) {
                    setError("Video generation failed: " + (e?.message || "Unknown error"));
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !videoTopic.trim()}
                className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating...</span>
                ) : (
                  <span className="flex items-center gap-2"><Film className="h-4 w-4" /> Generate Full Video</span>
                )}
              </button>
            </div>
            {status && <p className="text-xs text-muted-foreground">{status}</p>}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Video Result */}
          <div className="lg:col-span-2">
            {videoResult && (
              <div className="space-y-4">
                {videoResult.script && (
                  <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Film className="h-4 w-4 text-purple-500" /> {videoResult.script.title}
                    </h3>
                    <p className="text-sm text-muted-foreground italic">"{videoResult.script.hook}"</p>
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground">Scenes</h4>
                      {videoResult.script.scenes?.map((scene: any, i: number) => (
                        <div key={i} className="flex gap-3 rounded-lg bg-background border border-border/40 p-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-xs font-bold text-purple-500">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm">{scene.text}</p>
                            <p className="text-[11px] text-muted-foreground">{scene.visual} ({scene.duration})</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {videoResult.script.voiceover && (
                      <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3">
                        <p className="text-xs font-semibold text-purple-600 mb-1">Voiceover Script</p>
                        <p className="text-sm text-muted-foreground">{videoResult.script.voiceover}</p>
                      </div>
                    )}
                  </div>
                )}
                {videoResult.video && (
                  <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Video className="h-4 w-4 text-blue-500" /> Generated Video
                    </h4>
                    {videoResult.video.video_url ? (
                      <video controls className="w-full rounded-lg" src={videoResult.video.video_url} />
                    ) : (
                      <p className="text-sm text-muted-foreground">Video queued (fal.ai processing...)</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Model: {videoResult.video.model} | Duration: {videoResult.video.duration}s | Cost: ${videoResult.video.cost}
                    </p>
                  </div>
                )}
                {videoResult.voiceover && (
                  <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-green-500" /> Voiceover Audio
                    </h4>
                    <audio controls className="w-full" src={videoResult.voiceover.audio_url} />
                    <p className="text-xs text-muted-foreground">
                      Voice: {videoResult.voiceover.voice} | Duration: {videoResult.voiceover.duration} | Size: {videoResult.voiceover.size_kb}KB
                    </p>
                  </div>
                )}
              </div>
            )}
            {!videoResult && (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 p-10">
                <div className="text-center text-muted-foreground">
                  <Film className="mx-auto h-12 w-12 opacity-20 mb-3" />
                  <p className="text-sm">Enter a topic to generate a video with script, visuals, and voiceover</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content AI Tab (Blog & Social) */}
      {tab === "content" && <ContentAITab />}

      {/* Queue Tab */}
      {tab === "queue" && <QueueTab onViewDetail={setDetailItem} />}

      {/* Calendar Tab */}
      {tab === "calendar" && <CalendarTab />}

      {/* Stats Tab */}
      {tab === "stats" && <StatsTab getStats={getStats} />}

      {/* Cost Monitor Tab */}
      {tab === "costs" && (
        <CostMonitorTab
          dashboard={costDashboard}
          onRefresh={async () => {
            setCostDashboard(null);
            try {
              const res = await refreshModelsServer({});
              const dash = await costDashboardServer({});
              setCostDashboard({ ...dash, refreshResult: res });
            } catch (e) {
              console.error(e);
            }
          }}
        />
      )}

      {/* Content Detail Drawer */}
      {detailItem && (
        <ContentDetailDrawer item={detailItem} onClose={() => setDetailItem(null)} onRefresh={() => { if (tab === "queue") { getQueue({ data: {} }).then((res) => setDetailItem(null)); } }} />
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
          <button onClick={() => {
            const parts: string[] = [];
            if (content.caption) parts.push(content.caption);
            if (content.question) parts.push(content.question + "\n\n" + (content.options || []).map((o: string, i: number) => `${i + 1}. ${o}`).join("\n"));
            if (content.tweets) parts.push(content.tweets.join("\n\n"));
            if (content.title) parts.push(content.title);
            if (content.hashtags?.length) parts.push("\n" + content.hashtags.map((t: string) => "#" + t).join(" "));
            if (content.hook) parts.push("Hook: " + content.hook);
            if (content.slides) {
              parts.push("\n--- SLIDES ---");
              content.slides.forEach((s: any, i: number) => {
                parts.push(`\nSlide ${i + 1}: ${s.headline || s.text || ""}\n${s.body || ""}`);
              });
            }
            navigator.clipboard.writeText(parts.join("\n\n"));
          }}
            className="rounded-lg bg-gradient-pink px-2 py-1 text-xs text-primary-foreground hover:opacity-90">
            <Copy className="h-3 w-3 inline mr-1" /> Copy
          </button>
          <button onClick={() => {
            const images: string[] = [];
            if (content.image_url) images.push(content.image_url);
            if (content.slides) content.slides.forEach((s: any) => { if (s.image_url) images.push(s.image_url); });
            if (images.length === 0) { alert("No images to download"); return; }
            images.forEach((url, i) => {
              const a = document.createElement("a"); a.href = url; a.download = `image_${i + 1}.png`; a.target = "_blank";
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
            });
          }}
            className="rounded-lg bg-muted px-2 py-1 text-xs hover:bg-muted/80">
            <Download className="h-3 w-3 inline mr-1" /> Images
          </button>
        </div>
      </div>

      {/* Carousel Preview */}
      {type === "carousel" && (content.slides || content.title) && (
        <div className="space-y-3">
          {content.title && <h4 className="text-sm font-medium">{content.title}</h4>}
          {content.slides && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {content.slides.map((slide: any, i: number) => (
                <div key={i} className="min-w-[200px] rounded-xl border border-border/60 bg-background overflow-hidden">
                  {slide.image_url && (
                    <img src={slide.image_url} alt={slide.headline || ""} className="h-40 w-full object-cover" />
                  )}
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-bold line-clamp-2">{slide.headline || slide.text || ""}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-3">{slide.body || ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {content.caption && <p className="text-sm text-muted-foreground">{content.caption}</p>}
          {content.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {content.hashtags.map((tag: string, i: number) => (
                <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reel Script Preview */}
      {type === "reel" && (
        <div className="space-y-3">
          {content.hook && (
            <div className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-600 font-medium">Hook: {content.hook}</div>
          )}
          {content.scenes && content.scenes.length > 0 ? (
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
          ) : content.text ? (
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <p className="text-sm whitespace-pre-wrap">{content.text}</p>
            </div>
          ) : null}
          {content.caption && <p className="text-sm text-muted-foreground">{content.caption}</p>}
          {content.music_suggestion && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Music className="h-3 w-3" /> {content.music_suggestion}
            </p>
          )}
          {content.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {content.hashtags.map((tag: string, i: number) => (
                <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Story Preview */}
      {type === "story" && (
        <div className="space-y-3">
          {content.slides && content.slides.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {content.slides.map((slide: any, i: number) => (
                <div key={i} className="min-w-[160px] rounded-xl border border-border/60 bg-background overflow-hidden">
                  {slide.image_url && <img src={slide.image_url} alt="" className="h-48 w-full object-cover" />}
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-medium line-clamp-3">{slide.text || slide.headline || ""}</p>
                    {(slide.cta || slide.call_to_action) && (
                      <p className="text-[10px] text-primary font-medium">{slide.cta || slide.call_to_action}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : content.text ? (
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <p className="text-sm whitespace-pre-wrap">{content.text}</p>
            </div>
          ) : null}
          {content.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {content.hashtags.map((tag: string, i: number) => (
                <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Thread Preview */}
      {type === "thread" && (
        <div className="space-y-2">
          {content.tweets && content.tweets.length > 0 ? (
            content.tweets.map((tweet: string, i: number) => (
              <div key={i} className="rounded-lg border border-border/60 bg-background p-3">
                <p className="text-xs text-muted-foreground mb-1">Tweet {i + 1}/{content.tweets.length}</p>
                <p className="text-sm">{tweet}</p>
              </div>
            ))
          ) : content.text ? (
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <p className="text-sm whitespace-pre-wrap">{content.text}</p>
            </div>
          ) : null}
          {content.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {content.hashtags.map((tag: string, i: number) => (
                <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Poll Preview */}
      {type === "poll" && (
        <div className="rounded-lg border border-border/60 bg-background p-4 space-y-3">
          {content.question && <p className="font-medium">{content.question}</p>}
          {content.options?.map((opt: string, i: number) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
              <div className="h-4 w-4 rounded-full border-2 border-primary/30" />
              <span className="text-sm">{opt}</span>
            </div>
          ))}
          {content.caption && <p className="text-sm text-muted-foreground">{content.caption}</p>}
        </div>
      )}

      {/* Thumbnail Preview */}
      {type === "thumbnail" && (
        <div className="space-y-2">
          {content.image_url ? (
            <img src={content.image_url} alt="Thumbnail" className="w-full rounded-lg" />
          ) : content.image_prompt ? (
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <p className="text-xs text-muted-foreground">Image prompt: {content.image_prompt}</p>
            </div>
          ) : null}
          {content.image_prompt && content.image_url && (
            <p className="text-xs text-muted-foreground">{content.image_prompt}</p>
          )}
        </div>
      )}

      {/* Generic Fallback — if no specific preview matched */}
      {type !== "carousel" && type !== "reel" && type !== "story" && type !== "thread" && type !== "poll" && type !== "thumbnail" && content && (
        <div className="rounded-lg border border-border/60 bg-background p-3">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}

      {/* Fallback: show raw if specific section didn't render */}
      {type === "carousel" && !content.slides && !content.title && content && (
        <div className="rounded-lg border border-border/60 bg-background p-3">
          <p className="text-xs text-muted-foreground mb-2">Generated content:</p>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}
      {type === "reel" && !content.scenes && !content.text && content && (
        <div className="rounded-lg border border-border/60 bg-background p-3">
          <p className="text-xs text-muted-foreground mb-2">Generated content:</p>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}
      {type === "story" && !content.slides && !content.text && content && (
        <div className="rounded-lg border border-border/60 bg-background p-3">
          <p className="text-xs text-muted-foreground mb-2">Generated content:</p>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}
      {type === "thread" && !content.tweets && !content.text && content && (
        <div className="rounded-lg border border-border/60 bg-background p-3">
          <p className="text-xs text-muted-foreground mb-2">Generated content:</p>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64">
            {JSON.stringify(content, null, 2)}
          </pre>
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
  const repurposeServer = useServerFn(quickRepurposeFn);

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
      const res = await repurposeServer({
        data: { content, source_type, target_type: format, topic }
      });
      setResults((prev) => [...prev, { format, result: res }]);
    } catch (e: any) {
      setResults((prev) => [...prev, { format, error: e?.message || "Failed" }]);
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
      {results.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-purple-500/20">
          {results.map((r, i) => (
            <div key={i} className="rounded-lg bg-background border border-border/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium capitalize">{r.format.replace("_", " ")}</span>
                {r.error ? (
                  <span className="text-[10px] text-red-500">{r.error}</span>
                ) : (
                  <Check className="h-3 w-3 text-green-500" />
                )}
              </div>
              {r.result && (
                <p className="text-[11px] text-muted-foreground line-clamp-3">
                  {typeof r.result === "string" ? r.result : JSON.stringify(r.result).slice(0, 200)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
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

// ── Content AI Tab (Blog & Social) ──────────────────────

function ContentAITab() {
  const [blogTopic, setBlogTopic] = useState("");
  const [blogFormat, setBlogFormat] = useState("guide");
  const [blogWords, setBlogWords] = useState(800);
  const [socialPlatform, setSocialPlatform] = useState("instagram");
  const [socialTopic, setSocialTopic] = useState("");
  const [socialGoal, setSocialGoal] = useState("engagement");
  const [blogLoading, setBlogLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [detailJob, setDetailJob] = useState<any>(null);
  const [blogTab, setBlogTab] = useState<"blog" | "social">("blog");

  const handleBlogGenerate = async () => {
    if (!blogTopic.trim()) return;
    setBlogLoading(true);
    try {
      await generateBlogPost({ data: { topic: blogTopic, format: blogFormat, word_count: blogWords } });
      setBlogTopic("");
    } catch (e) {
      console.error(e);
    } finally {
      setBlogLoading(false);
    }
  };

  const handleSocialGenerate = async () => {
    if (!socialTopic.trim()) return;
    setSocialLoading(true);
    try {
      await generateSocialPost({ data: { platform: socialPlatform, topic: socialTopic, goal: socialGoal } });
      setSocialTopic("");
    } catch (e) {
      console.error(e);
    } finally {
      setSocialLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border/60">
        <button onClick={() => setBlogTab("blog")} className={`px-4 py-2 text-sm font-medium border-b-2 ${blogTab === "blog" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Blog Posts</button>
        <button onClick={() => setBlogTab("social")} className={`px-4 py-2 text-sm font-medium border-b-2 ${blogTab === "social" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Social Posts</button>
      </div>

      {blogTab === "blog" && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
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
            <button onClick={handleBlogGenerate} disabled={!blogTopic.trim() || blogLoading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50">
              {blogLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><FileText className="h-4 w-4" /> Generate Blog Post</>}
            </button>
          </div>
        </div>
      )}

      {blogTab === "social" && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
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
            <button onClick={handleSocialGenerate} disabled={!socialTopic.trim() || socialLoading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50">
              {socialLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><MessageSquare className="h-4 w-4" /> Generate Social Post</>}
            </button>
          </div>
        </div>
      )}
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
                <button onClick={(e) => {
                  e.stopPropagation();
                  const od = item.output_data || {};
                  const images: string[] = [];
                  if (od.image_url) images.push(od.image_url);
                  if (od.slides) od.slides.forEach((s: any) => { if (s.image_url) images.push(s.image_url); });
                  const parts: string[] = [];
                  if (od.caption) parts.push(od.caption);
                  if (od.title) parts.push(od.title);
                  if (od.hashtags?.length) parts.push(od.hashtags.map((t: string) => "#" + t).join(" "));
                  if (od.hook) parts.push("Hook: " + od.hook);
                  if (od.slides) od.slides.forEach((s: any, i: number) => { parts.push(`Slide ${i + 1}: ${s.headline || s.text || ""}\n${s.body || ""}`); });
                  if (od.tweets) parts.push(od.tweets.join("\n\n"));
                  if (od.question) parts.push(od.question + "\n\n" + (od.options || []).map((o: string, i: number) => `${i + 1}. ${o}`).join("\n"));
                  if (images.length > 0) {
                    images.forEach((url, i) => {
                      const a = document.createElement("a"); a.href = url; a.download = `${item.job_type}_image_${i + 1}.png`; a.target = "_blank";
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    });
                  }
                  if (parts.length > 0) {
                    const blob = new Blob([parts.join("\n\n")], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = `${item.job_type}_${Date.now()}.txt`; a.click();
                  }
                }} className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20" title="Download content">
                  <Download className="h-4 w-4" />
                </button>
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

function ContentDetailDrawer({ item, onClose, onRefresh }: { item: any; onClose: () => void; onRefresh?: () => void }) {
  const outputData = item.output_data || {};
  const [activeSlide, setActiveSlide] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [improving, setImproving] = useState(false);

  const getTypeIcon = (type: string) => {
    const map: Record<string, any> = { carousel: Layout, reel_script: Film, thumbnail: Image, story: Sparkles, thread: MessageSquare, poll: Hash };
    return map[type] || FileText;
  };
  const TypeIcon = getTypeIcon(item.job_type);

  const improveServer = useServerFn(improveContentFn);
  const updateOutputServer = useServerFn(updateContentOutput);

  const handleImprove = async () => {
    if (!editInstruction.trim()) return;
    setImproving(true);
    try {
      const textContent = [
        outputData.caption,
        outputData.title,
        outputData.hook,
        outputData.slides?.map((s: any) => `${s.headline || s.text || ""}\n${s.body || ""}`).join("\n"),
        outputData.tweets?.join("\n\n"),
        outputData.question + "\n\n" + (outputData.options || []).map((o: string, i: number) => `${i + 1}. ${o}`).join("\n"),
      ].filter(Boolean).join("\n\n");

      const result = await improveServer({ data: { content: textContent, instruction: editInstruction, content_type: item.job_type } });

      const improved = typeof result === "string" ? result : (result as any)?.improved || JSON.stringify(result);
      const updatedOutput = { ...outputData, caption: improved, last_edited: new Date().toISOString(), edit_instruction: editInstruction };
      await updateOutputServer({ data: { id: item.id, output_data: updatedOutput } });
      setEditing(false);
      setEditInstruction("");
      onRefresh?.();
      alert("Content updated!");
    } catch (e: any) {
      alert("AI improve failed: " + (e.message || "Unknown error"));
    } finally {
      setImproving(false);
    }
  };

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
            <div className="flex justify-between"><span>Cost</span><span>${Number(item.total_cost_usd || 0).toFixed(4)}</span></div>
            <div className="flex justify-between"><span>Created</span><span>{new Date(item.created_at).toLocaleString()}</span></div>
          </div>

          {/* AI Improve */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Edit Content</h4>
              {!editing && (
                <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">Open Editor</button>
              )}
              {editing && (
                <button onClick={() => { setEditing(false); setEditInstruction(""); }} className="text-xs text-muted-foreground hover:underline">Cancel</button>
              )}
            </div>
            {editing && (
              <div className="space-y-2">
                <textarea
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  placeholder="Tell AI what to change... e.g. &quot;Make the hook more emotional&quot;, &quot;Add 3 more slides&quot;, &quot;Change tone to professional&quot;, &quot;Replace the images with studio lighting&quot;"
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px] resize-y"
                />
                <div className="flex gap-2">
                  {["Make it more emotional", "Add more slides", "Change to professional tone", "Better hook", "Add statistics"].map((preset) => (
                    <button key={preset} onClick={() => setEditInstruction(preset)}
                      className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs hover:bg-muted">{preset}</button>
                  ))}
                </div>
                <button onClick={handleImprove} disabled={improving || !editInstruction.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-pink px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {improving ? <><Loader2 className="h-4 w-4 animate-spin" /> Regenerating...</> : <><Sparkles className="h-4 w-4" /> Apply Changes</>}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={() => {
              const parts: string[] = [];
              if (outputData.caption) parts.push(outputData.caption);
              if (outputData.question) parts.push(outputData.question + "\n\n" + (outputData.options || []).map((o: string, i: number) => `${i + 1}. ${o}`).join("\n"));
              if (outputData.tweets) parts.push(outputData.tweets.join("\n\n"));
              if (outputData.title) parts.push(outputData.title);
              if (outputData.hashtags?.length) parts.push("\n" + outputData.hashtags.map((t: string) => "#" + t).join(" "));
              if (outputData.hook) parts.push("Hook: " + outputData.hook);
              if (outputData.slides) {
                parts.push("\n--- SLIDES ---");
                outputData.slides.forEach((s: any, i: number) => {
                  parts.push(`\nSlide ${i + 1}: ${s.headline || s.text || ""}\n${s.body || ""}`);
                });
              }
              navigator.clipboard.writeText(parts.join("\n\n"));
              alert("Caption + hashtags copied!");
            }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-pink px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Copy className="h-4 w-4" /> Copy Caption + Hashtags
            </button>
            <div className="flex gap-2">
              <button onClick={async () => {
                const images: string[] = [];
                if (outputData.image_url) images.push(outputData.image_url);
                if (outputData.slides) outputData.slides.forEach((s: any) => { if (s.image_url) images.push(s.image_url); });
                if (images.length === 0) { alert("No images to download"); return; }
                for (let i = 0; i < images.length; i++) {
                  const a = document.createElement("a");
                  a.href = images[i];
                  a.download = `${item.job_type}_image_${i + 1}.png`;
                  a.target = "_blank";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  if (i < images.length - 1) await new Promise(r => setTimeout(r, 500));
                }
              }} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm hover:bg-muted/80">
                <Download className="h-4 w-4" /> Images ({(() => { let c = 0; if (outputData.image_url) c++; if (outputData.slides) c += outputData.slides.filter((s: any) => s.image_url).length; return c; })()})
              </button>
              <button onClick={() => {
                const blob = new Blob([JSON.stringify(outputData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `${item.job_type}_${Date.now()}.json`; a.click();
              }} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm hover:bg-muted/80">
                <FileText className="h-4 w-4" /> Export JSON
              </button>
            </div>
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
          { label: "Total Cost", value: `$${Number(s.total_cost || 0).toFixed(2)}`, icon: Target, color: "text-purple-500" },
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

// ── Cost Monitor Tab ───────────────────────────────────

function CostMonitorTab({ dashboard, onRefresh }: { dashboard: any; onRefresh: () => void }) {
  if (!dashboard) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading cost data...</span>
      </div>
    );
  }

  const d = dashboard;
  const budget = d.budget || {};
  const today = d.today || {};
  const week = d.this_week || {};
  const month = d.this_month || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-500" /> OpenRouter Cost Monitor
          </h3>
          <p className="text-sm text-muted-foreground">
            Active model: <span className="font-mono text-foreground">{d.active_model || "none"}</span>
            {" "} • {d.free_models_available || 0} free models available
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-muted/80"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Cost Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Today", requests: today.requests, cost: today.cost_usd, tokens: today.tokens, color: "text-green-500" },
          { label: "This Week", requests: week.requests, cost: week.cost_usd, tokens: week.tokens, color: "text-blue-500" },
          { label: "This Month", requests: month.requests, cost: month.cost_usd, tokens: month.tokens, color: "text-purple-500" },
          { label: "Budget Remaining", requests: null, cost: budget.monthly_remaining, tokens: null, color: budget.monthly_pct > 0.8 ? "text-red-500" : "text-green-500", suffix: "left" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.cost != null ? `$${card.cost.toFixed(3)}` : "—"}
              {card.suffix && <span className="text-xs font-normal ml-1">{card.suffix}</span>}
            </p>
            {card.requests != null && (
              <p className="text-xs text-muted-foreground mt-1">{card.requests} requests • {((card.tokens || 0) / 1000).toFixed(1)}K tokens</p>
            )}
          </div>
        ))}
      </div>

      {/* Budget Bars */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Daily Budget</span>
            <span className="text-xs text-muted-foreground">${(budget.daily_pct * 100).toFixed(0)}% used</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budget.daily_pct > 0.8 ? "bg-red-500" : budget.daily_pct > 0.5 ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${Math.min(100, budget.daily_pct * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">${budget.daily_remaining?.toFixed(2)} remaining of $2.00/day</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Monthly Budget</span>
            <span className="text-xs text-muted-foreground">${(budget.monthly_pct * 100).toFixed(0)}% used</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budget.monthly_pct > 0.8 ? "bg-red-500" : budget.monthly_pct > 0.5 ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${Math.min(100, budget.monthly_pct * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">${budget.monthly_remaining?.toFixed(2)} remaining of $60.00/month</p>
        </div>
      </div>

      {/* Model Health */}
      {d.health?.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Model Health
          </h3>
          <div className="space-y-2">
            {d.health.map((h: any) => (
              <div key={h.model} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${h.available ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-sm font-mono">{h.model.split("/").pop()}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{h.latency_ms}ms</span>
                  <span>{(h.success_rate * 100).toFixed(0)}% success</span>
                  <span>{h.total_attempts} attempts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Model Switches */}
      {d.recent_switches?.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Repeat className="h-4 w-4" /> Recent Model Switches
          </h3>
          <div className="space-y-1">
            {d.recent_switches.slice(0, 10).map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">
                  {s.from.split("/").pop()} → {s.to.split("/").pop()}
                </span>
                <span className="text-muted-foreground text-xs">{s.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost by Task Type */}
      {d.task_costs && Object.keys(d.task_costs).length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-5">
          <h3 className="font-semibold mb-3">Cost by Task (7 days)</h3>
          <div className="space-y-2">
            {Object.entries(d.task_costs).map(([task, data]: [string, any]) => (
              <div key={task} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2">
                <span className="text-sm">{task}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{data.requests} req</span>
                  <span>{((data.tokens || 0) / 1000).toFixed(1)}K tok</span>
                  <span>{data.avg_latency?.toFixed(0)}ms avg</span>
                  <span className="font-medium text-foreground">${data.cost?.toFixed(4) || "0"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free Models List */}
      {d.free_models_list?.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-5">
          <h3 className="font-semibold mb-3">Available Free Models ({d.free_models_list.length})</h3>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {d.free_models_list.map((m: any) => (
              <div key={m.id} className="rounded-lg bg-background/50 px-3 py-2">
                <p className="text-xs font-mono truncate">{m.name || m.id.split("/").pop()}</p>
                <p className="text-[10px] text-muted-foreground">{m.context} ctx • {m.modality}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
