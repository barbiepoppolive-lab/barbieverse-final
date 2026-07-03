import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Zap, ArrowRight, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/admin/content-compare")({
  ssr: false,
  component: ContentComparePage,
});

function ContentComparePage() {
  const [topic, setTopic] = useState("5 ways to grow your Poppo Live audience in 2026");
  const [loading, setLoading] = useState<"premium" | "free" | null>(null);
  const [premiumResult, setPremiumResult] = useState<any>(null);
  const [freeResult, setFreeResult] = useState<any>(null);
  const [copied, setCopied] = useState<"premium" | "free" | null>(null);

  const generatePremium = async () => {
    setLoading("premium");
    try {
      // Uses Claude Sonnet 4 via OpenRouter ($0.003/token)
      const res = await fetch("/api/brand-manager/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, provider: "premium" }),
      });
      const data = await res.json();
      setPremiumResult(data);
    } catch (e) {
      setPremiumResult({ error: "Failed to generate" });
    } finally {
      setLoading(null);
    }
  };

  const generateFree = async () => {
    setLoading("free");
    try {
      // Uses Llama 3.3 70B via OpenRouter (free)
      const res = await fetch("/api/brand-manager/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, provider: "free" }),
      });
      const data = await res.json();
      setFreeResult(data);
    } catch (e) {
      setFreeResult({ error: "Failed to generate" });
    } finally {
      setLoading(null);
    }
  };

  const generateBoth = async () => {
    setPremiumResult(null);
    setFreeResult(null);
    setLoading("premium");
    try {
      const [premiumRes, freeRes] = await Promise.all([
        fetch("/api/brand-manager/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, provider: "premium" }),
        }),
        fetch("/api/brand-manager/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, provider: "free" }),
        }),
      ]);
      const [premiumData, freeData] = await Promise.all([premiumRes.json(), freeRes.json()]);
      setPremiumResult(premiumData);
      setFreeResult(freeData);
    } catch (e) {
      setPremiumResult({ error: "Failed" });
      setFreeResult({ error: "Failed" });
    } finally {
      setLoading(null);
    }
  };

  const copyToClipboard = (text: string, which: "premium" | "free") => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-3">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Content Quality Comparison</h1>
          <p className="text-sm text-muted-foreground">Premium (Claude) vs Free (Llama 3.3 70B)</p>
        </div>
      </div>

      {/* Topic Input */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Content Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm"
            placeholder="Enter a topic to compare..."
          />
        </div>
        <button
          onClick={generateBoth}
          disabled={loading !== null || !topic.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? "Generating..." : "Generate Both & Compare"}
        </button>
      </div>

      {/* Side by Side Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Premium (Claude) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-600">
                PREMIUM — Claude Sonnet 4
              </span>
              <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">PAID</span>
            </div>
            <button
              onClick={() => generatePremium()}
              disabled={loading !== null}
              className="rounded-lg bg-muted px-3 py-1.5 text-xs hover:bg-muted/80 disabled:opacity-50"
            >
              <Zap className="h-3 w-3 inline mr-1" /> Regenerate
            </button>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 min-h-[300px]">
            {loading === "premium" ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                <span className="ml-2 text-sm text-muted-foreground">Claude is writing...</span>
              </div>
            ) : premiumResult?.error ? (
              <p className="text-sm text-destructive">{premiumResult.error}</p>
            ) : premiumResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-amber-600">{premiumResult.title}</h3>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(premiumResult, null, 2), "premium")}
                    className="rounded bg-muted p-1.5 hover:bg-muted/80"
                  >
                    {copied === "premium" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                {premiumResult.slides?.map((slide: any, i: number) => (
                  <div key={i} className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Slide {i + 1}</p>
                    <p className="text-sm font-medium">{slide.headline}</p>
                    <p className="text-xs text-muted-foreground mt-1">{slide.body}</p>
                  </div>
                ))}
                {premiumResult.caption && (
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Caption</p>
                    <p className="text-sm">{premiumResult.caption}</p>
                  </div>
                )}
                {premiumResult.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {premiumResult.hashtags.map((tag: string, i: number) => (
                      <span key={i} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Click "Generate Both" to see Claude's output
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            ~$0.003 per generation • Best quality • Human-like writing
          </p>
        </div>

        {/* Free (Llama) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-600">
                FREE — Llama 3.3 70B
              </span>
              <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-500">$0</span>
            </div>
            <button
              onClick={() => generateFree()}
              disabled={loading !== null}
              className="rounded-lg bg-muted px-3 py-1.5 text-xs hover:bg-muted/80 disabled:opacity-50"
            >
              <Zap className="h-3 w-3 inline mr-1" /> Regenerate
            </button>
          </div>

          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 min-h-[300px]">
            {loading === "free" ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                <span className="ml-2 text-sm text-muted-foreground">Llama is writing...</span>
              </div>
            ) : freeResult?.error ? (
              <p className="text-sm text-destructive">{freeResult.error}</p>
            ) : freeResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-green-600">{freeResult.title}</h3>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(freeResult, null, 2), "free")}
                    className="rounded bg-muted p-1.5 hover:bg-muted/80"
                  >
                    {copied === "free" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                {freeResult.slides?.map((slide: any, i: number) => (
                  <div key={i} className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Slide {i + 1}</p>
                    <p className="text-sm font-medium">{slide.headline}</p>
                    <p className="text-xs text-muted-foreground mt-1">{slide.body}</p>
                  </div>
                ))}
                {freeResult.caption && (
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Caption</p>
                    <p className="text-sm">{freeResult.caption}</p>
                  </div>
                )}
                {freeResult.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {freeResult.hashtags.map((tag: string, i: number) => (
                      <span key={i} className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Click "Generate Both" to see Llama's output
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            $0.00 per generation • Good quality • Great for bulk content
          </p>
        </div>
      </div>

      {/* Quality Comparison Guide */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-5">
        <h3 className="font-semibold mb-3">Quality Comparison Guide</h3>
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <div>
            <p className="font-medium text-amber-600 mb-1">Claude Sonnet 4 (Premium)</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• More creative hooks and storytelling</li>
              <li>• Better emotional resonance</li>
              <li>• Fewer generic phrases</li>
              <li>• More specific examples</li>
              <li>• Natural conversational flow</li>
              <li>• Cost: ~$0.003/generation</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-green-600 mb-1">Llama 3.3 70B (Free)</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Good structure and formatting</li>
              <li>• Solid for educational content</li>
              <li>• May repeat patterns</li>
              <li>• Less nuanced emotional tone</li>
              <li>• Great for bulk/scheduled content</li>
              <li>• Cost: $0.00</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-primary mb-1">Recommended Strategy</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Use Claude for: Carousels, Threads, DMs</li>
              <li>• Use Llama for: Blog posts, Bulk captions</li>
              <li>• Use Gemini for: Analysis, Research</li>
              <li>• Use Groq for: Real-time chat</li>
              <li>• Mix & match to stay within budget</li>
              <li>• Average: $0.00 - $0.50/day</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
