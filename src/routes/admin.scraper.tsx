// Scraper Dashboard — Multi-platform lead scraping & import
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import {
  getScraperDashboard,
  runScrapeJob,
  importFromCSV,
  importResultsToLeads,
  getScrapeJobResults,
  deleteScrapeJob,
  getCSVImportTemplate,
  getProviderStatus,
} from "@/lib/api/scraper.functions";
import {
  Globe, Instagram, Facebook, Twitter, Youtube, MessageCircle,
  Upload, Play, Trash2, Download, AlertCircle, CheckCircle,
  Clock, RefreshCw, FileText, Search, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/scraper")({
  component: ScraperDashboard,
});

const PLATFORM_ICONS: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
  telegram: MessageCircle,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "text-pink-400",
  facebook: "text-blue-400",
  twitter: "text-sky-400",
  youtube: "text-red-400",
  telegram: "text-blue-300",
};

function ScraperDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [providerStatus, setProviderStatus] = useState<any>(null);
  const [tab, setTab] = useState<"overview" | "scrape" | "import" | "jobs" | "keywords">("overview");

  // Scrape form
  const [scrapeProvider, setScrapeProvider] = useState<"apify" | "phantombuster">("apify");
  const [scrapePlatform, setScrapePlatform] = useState<string>("instagram");
  const [scrapeTarget, setScrapeTarget] = useState<string>("profiles");
  const [scrapeUrls, setScrapeUrls] = useState("");
  const [scrapeLimit, setScrapeLimit] = useState(20);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);

  // CSV Import
  const [csvContent, setCsvContent] = useState("");
  const [csvFilename, setCsvFilename] = useState("");
  const [csvPlatform, setCsvPlatform] = useState<string>("instagram");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Job results
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobResults, setJobResults] = useState<any[]>([]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dash, status] = await Promise.all([
        getScraperDashboard(),
        getProviderStatus(),
      ]);
      setDashboard(dash);
      setProviderStatus(status);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleScrape = async () => {
    const urls = scrapeUrls.split("\n").filter((u) => u.trim());
    if (urls.length === 0) return;

    setScraping(true);
    setScrapeResult(null);
    try {
      const result = await runScrapeJob({
        data: {
          provider: scrapeProvider,
          platform: scrapePlatform as any,
          target: scrapeTarget as any,
          urls,
          limit: scrapeLimit,
        },
      });
      setScrapeResult(result);
      loadDashboard();
    } catch (err: any) {
      setScrapeResult({ error: err.message });
    }
    setScraping(false);
  };

  const handleCSVImport = async () => {
    if (!csvContent.trim()) return;

    setImporting(true);
    setImportResult(null);
    try {
      const result = await importFromCSV({
        data: {
          content: csvContent,
          filename: csvFilename || "import.csv",
          platformHint: csvPlatform as any,
        },
      });
      setImportResult(result);
    } catch (err: any) {
      setImportResult({ errors: [err.message], profiles: [], posts: [], totalRows: 0, successRows: 0 });
    }
    setImporting(false);
  };

  const handleImportToLeads = async (jobIds: string[]) => {
    try {
      const result = await importResultsToLeads({ data: { jobIds } });
      alert(`Imported: ${result.imported}, Skipped: ${result.skipped}`);
      loadDashboard();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  const handleViewResults = async (job: any) => {
    setSelectedJob(job);
    try {
      const results = await getScrapeJobResults({ data: { jobId: job.id, limit: 50 } });
      setJobResults(results);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Delete this scrape job and all its results?")) return;
    try {
      await deleteScrapeJob({ data: { jobId } });
      loadDashboard();
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
        setJobResults([]);
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleGetTemplate = async () => {
    try {
      const result = await getCSVImportTemplate({ data: { platform: csvPlatform as any } });
      setCsvContent(result.template);
      setCsvFilename(`${csvPlatform}_leads.csv`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvContent(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Scraper Hub</h1>
            <p className="text-sm text-gray-400">Multi-platform lead scraping & import</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className={`flex items-center gap-1 ${providerStatus?.apify ? 'text-green-400' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${providerStatus?.apify ? 'bg-green-400' : 'bg-gray-500'}`} />
            Apify {providerStatus?.apify ? '✓' : '✗'}
          </div>
          <div className={`flex items-center gap-1 ${providerStatus?.phantombuster ? 'text-green-400' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${providerStatus?.phantombuster ? 'bg-green-400' : 'bg-gray-500'}`} />
            Phantombuster {providerStatus?.phantombuster ? '✓' : '✗'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
        {(["overview", "scrape", "keywords", "import", "jobs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "overview" && "Overview"}
            {t === "scrape" && "Scrape"}
            {t === "keywords" && "Keywords"}
            {t === "import" && "CSV Import"}
            {t === "jobs" && "Jobs"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && dashboard && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Jobs" value={dashboard.totalJobs} icon={Globe} color="purple" />
            <StatCard label="Total Results" value={dashboard.totalResults} icon={Search} color="blue" />
            <StatCard label="Completed" value={dashboard.statusCounts.completed} icon={CheckCircle} color="green" />
            <StatCard label="Failed" value={dashboard.statusCounts.failed} icon={AlertCircle} color="red" />
          </div>

          {/* Platform Breakdown */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Platform Results</h3>
            <div className="space-y-3">
              {dashboard.platformImport?.map((p: any) => {
                const Icon = PLATFORM_ICONS[p.platform] || Globe;
                return (
                  <div key={p.platform} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${PLATFORM_COLORS[p.platform] || "text-gray-400"}`} />
                      <span className="text-white capitalize">{p.platform}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">{p.total} scraped</span>
                      <span className="text-green-400">{p.imported} imported</span>
                      <span className="text-gray-500">{p.total - p.imported} pending</span>
                    </div>
                  </div>
                );
              })}
              {(!dashboard.platformImport || dashboard.platformImport.length === 0) && (
                <p className="text-gray-500 text-sm">No results yet. Start scraping!</p>
              )}
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Jobs</h3>
            <div className="space-y-2">
              {dashboard.recentJobs?.slice(0, 5).map((job: any) => (
                <div key={job.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={job.status} />
                    <span className="text-white text-sm capitalize">{job.platform}</span>
                    <span className="text-gray-500 text-sm">→ {job.target}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>{job.result_count} results</span>
                    <span>${job.cost_usd || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scrape Tab */}
      {tab === "scrape" && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-6">
          <h3 className="text-lg font-semibold text-white">Run Scrape Job</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Provider</label>
              <select
                value={scrapeProvider}
                onChange={(e) => setScrapeProvider(e.target.value as any)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="apify">Apify (All Platforms)</option>
                <option value="phantombuster">Phantombuster (Instagram)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Platform</label>
              <select
                value={scrapePlatform}
                onChange={(e) => setScrapePlatform(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter/X</option>
                <option value="youtube">YouTube</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Target</label>
              <select
                value={scrapeTarget}
                onChange={(e) => setScrapeTarget(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="profiles">Profiles/Pages</option>
                <option value="posts">Posts</option>
                <option value="videos">Videos</option>
                <option value="followers">Followers</option>
                <option value="hashtags">Hashtags</option>
                <option value="comments">Comments</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              URLs (one per line)
            </label>
            <textarea
              value={scrapeUrls}
              onChange={(e) => setScrapeUrls(e.target.value)}
              placeholder={"https://instagram.com/username\nhttps://facebook.com/pagename\nhttps://x.com/handle"}
              className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Limit</label>
              <input
                type="number"
                value={scrapeLimit}
                onChange={(e) => setScrapeLimit(parseInt(e.target.value) || 20)}
                className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <button
              onClick={handleScrape}
              disabled={scraping || !scrapeUrls.trim()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium mt-6"
            >
              {scraping ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {scraping ? "Scraping..." : "Start Scrape"}
            </button>
          </div>

          {scrapeResult && (
            <div className={`p-4 rounded-lg ${scrapeResult.error ? 'bg-red-900/30 border border-red-800' : 'bg-green-900/30 border border-green-800'}`}>
              {scrapeResult.error ? (
                <p className="text-red-400">{scrapeResult.error}</p>
              ) : (
                <p className="text-green-400">
                  Done! {scrapeResult.resultCount} results scraped. Job ID: {scrapeResult.jobId}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* CSV Import Tab */}
      {tab === "import" && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">CSV/JSON Import</h3>
            <div className="flex gap-2">
              <select
                value={csvPlatform}
                onChange={(e) => setCsvPlatform(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter/X</option>
                <option value="youtube">YouTube</option>
                <option value="telegram">Telegram</option>
              </select>
              <button
                onClick={handleGetTemplate}
                className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm"
              >
                <Download className="w-4 h-4" />
                Get Template
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Upload File</label>
            <input
              type="file"
              accept=".csv,.tsv,.json"
              onChange={handleFileUpload}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Or Paste Content {csvFilename && `(${csvFilename})`}
            </label>
            <textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="username,full_name,bio,followers..."
              className="w-full h-48 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleCSVImport}
              disabled={importing || !csvContent.trim()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium"
            >
              {importing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {importing ? "Importing..." : "Parse & Preview"}
            </button>
          </div>

          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{importResult.totalRows}</p>
                  <p className="text-sm text-gray-400">Total Rows</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{importResult.successRows}</p>
                  <p className="text-sm text-gray-400">Parsed OK</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{importResult.errors.length}</p>
                  <p className="text-sm text-gray-400">Errors</p>
                </div>
              </div>

              {importResult.profiles.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4 max-h-64 overflow-auto">
                  <h4 className="text-sm font-medium text-white mb-2">Preview ({importResult.profiles.length} profiles)</h4>
                  <div className="space-y-2">
                    {importResult.profiles.slice(0, 10).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-700 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono">@{p.username}</span>
                          <span className="text-gray-500">{p.display_name}</span>
                        </div>
                        <span className="text-gray-400">{(p.followers || 0).toLocaleString()} followers</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 max-h-32 overflow-auto">
                  {importResult.errors.slice(0, 5).map((e: string, i: number) => (
                    <p key={i} className="text-red-400 text-sm">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Keywords Tab */}
      {tab === "keywords" && (
        <KeywordsTab />
      )}

      {/* Jobs Tab */}
      {tab === "jobs" && dashboard && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Scrape Jobs</h3>
            <button onClick={loadDashboard} className="text-gray-400 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Platform</th>
                  <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Target</th>
                  <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Provider</th>
                  <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Results</th>
                  <th className="text-left px-4 py-3 text-sm text-gray-400 font-medium">Created</th>
                  <th className="text-right px-4 py-3 text-sm text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentJobs?.map((job: any) => (
                  <tr key={job.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-white capitalize">
                        {(() => {
                          const Icon = PLATFORM_ICONS[job.platform] || Globe;
                          return <Icon className={`w-4 h-4 ${PLATFORM_COLORS[job.platform] || ""}`} />;
                        })()}
                        {job.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm capitalize">{job.target}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{job.provider}</td>
                    <td className="px-4 py-3 text-white text-sm">{job.result_count}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.status === "completed" && job.result_count > 0 && (
                          <>
                            <button
                              onClick={() => handleViewResults(job)}
                              className="text-purple-400 hover:text-purple-300 text-sm"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleImportToLeads([job.id])}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              Import
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!dashboard.recentJobs || dashboard.recentJobs.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                No scrape jobs yet. Go to Scrape tab to start one.
              </div>
            )}
          </div>

          {/* Job Results Panel */}
          {selectedJob && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-medium">
                  Results: {selectedJob.platform} / {selectedJob.target} ({jobResults.length})
                </h4>
                <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-white text-sm">
                  Close
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-auto">
                {jobResults.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded-lg text-sm">
                    <div className="flex items-center gap-3">
                      {r.item_type === "profile" ? (
                        <>
                          <span className="text-white font-mono">@{r.username}</span>
                          <span className="text-gray-500">{r.display_name}</span>
                        </>
                      ) : (
                        <span className="text-white truncate max-w-md">{r.post_text}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      {r.followers && <span>{r.followers.toLocaleString()} followers</span>}
                      {r.likes && <span>{r.likes} likes</span>}
                      {r.imported_to_leads && <CheckCircle className="w-4 h-4 text-green-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper Components ──────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colors: Record<string, string> = {
    purple: "bg-purple-900/30 border-purple-800 text-purple-400",
    blue: "bg-blue-900/30 border-blue-800 text-blue-400",
    green: "bg-green-900/30 border-green-800 text-green-400",
    red: "bg-red-900/30 border-red-800 text-red-400",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.purple}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6" />
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
    running: "bg-blue-900/30 text-blue-400 border-blue-800",
    completed: "bg-green-900/30 text-green-400 border-green-800",
    failed: "bg-red-900/30 text-red-400 border-red-800",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
      {status === "running" && <RefreshCw className="w-3 h-3 animate-spin" />}
      {status === "completed" && <CheckCircle className="w-3 h-3" />}
      {status === "failed" && <AlertCircle className="w-3 h-3" />}
      {status === "pending" && <Clock className="w-3 h-3" />}
      {status}
    </span>
  );
}

// ── Keywords Tab ────────────────────────────────────────

function KeywordsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const FIELDS = [
    { key: "scraper_keywords", label: "Search Keywords (all platforms)", placeholder: "poppo live\nvone live\nlive streaming earn money" },
    { key: "scraper_reddit_subreddits", label: "Reddit Subreddits", placeholder: "WorkOnline\nbeermoney\nbeermoneyindia" },
    { key: "scraper_facebook_queries", label: "Facebook Search Queries", placeholder: "poppo live\nvone live" },
    { key: "scraper_twitter_queries", label: "Twitter Search Queries", placeholder: "poppo live\nvone live" },
    { key: "scraper_youtube_queries", label: "YouTube Search Queries", placeholder: "poppo live earn money\nvone live india" },
  ];

  useEffect(() => {
    (async () => {
      try {
        const { getAllSettings } = await import("@/lib/api/settings.functions");
        const settings = await getAllSettings();
        setDraft(settings);
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
      setLoading(false);
    })();
  }, []);

  const save = async (key: string) => {
    setSaving(key);
    try {
      const { updateSetting } = await import("@/lib/api/settings.functions");
      await updateSetting({ data: { key, value: draft[key] || "" } });
    } catch (e: any) {
      alert("Save failed: " + e.message);
    }
    setSaving(null);
  };

  if (loading) return <div className="text-gray-400 py-8 text-center">Loading keywords...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Monitor Keywords</h3>
        <p className="text-sm text-gray-400">One keyword per line. Used by the social monitor to find leads on Reddit, Facebook, Twitter, YouTube.</p>
      </div>
      {FIELDS.map((f) => (
        <div key={f.key} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <label className="text-sm font-medium text-gray-300">{f.label}</label>
          <textarea
            value={draft[f.key] || ""}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            rows={4}
            className="mt-2 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none resize-none"
          />
          <button
            onClick={() => save(f.key)}
            disabled={saving === f.key}
            className="mt-2 rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {saving === f.key ? "Saving..." : "Save"}
          </button>
        </div>
      ))}
    </div>
  );
}
