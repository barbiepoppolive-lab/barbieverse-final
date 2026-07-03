// Test route for AI Router — verify all providers work
// Access at /test-ai (admin only)

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { aiRoute, aiChat, aiCode, aiAnalyze, aiContent } from "@/lib/ai";
import { ollamaIsAvailable } from "@/lib/ai/providers/ollama";
import { getAllUsage } from "@/lib/ai/rate-limiter";

export const Route = createFileRoute("/test-ai")({
  beforeLoad: async () => {
    const { adminStatus } = await import("@/lib/api/admin.functions");
    const status = await adminStatus();
    if (!status.isAdmin) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: TestAI,
});

interface TestResult {
  provider: string;
  task: string;
  text: string;
  latencyMs: number;
  success: boolean;
  error?: string;
}

function TestAI() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<string>("unchecked");

  const runTests = async () => {
    setLoading(true);
    setResults([]);

    const testResults: TestResult[] = [];

    // Test 1: Chat via router (should pick Groq)
    try {
      const start = Date.now();
      const res = await aiChat("Say 'Hello from BarbieVerse AI Router' in 5 words or less.");
      testResults.push({
        provider: res.provider,
        task: "Chat",
        text: res.text,
        latencyMs: res.latencyMs,
        success: true,
      });
    } catch (err: any) {
      testResults.push({
        provider: "unknown",
        task: "Chat",
        text: "",
        latencyMs: 0,
        success: false,
        error: err.message,
      });
    }

    // Test 2: Analysis via router (should pick Gemini)
    try {
      const res = await aiAnalyze("What is 2+2? Reply with just the number.");
      testResults.push({
        provider: res.provider,
        task: "Analysis",
        text: res.text,
        latencyMs: res.latencyMs,
        success: true,
      });
    } catch (err: any) {
      testResults.push({
        provider: "unknown",
        task: "Analysis",
        text: "",
        latencyMs: 0,
        success: false,
        error: err.message,
      });
    }

    // Test 3: Code via router (should pick Mistral)
    try {
      const res = await aiCode("Write a TypeScript function that adds two numbers. Just the function, no explanation.");
      testResults.push({
        provider: res.provider,
        task: "Code",
        text: res.text,
        latencyMs: res.latencyMs,
        success: true,
      });
    } catch (err: any) {
      testResults.push({
        provider: "unknown",
        task: "Code",
        text: "",
        latencyMs: 0,
        success: false,
        error: err.message,
      });
    }

    // Test 4: Content via router (should pick Gemini)
    try {
      const res = await aiContent("Write one catchy Instagram caption for a creator economy platform. Under 50 words.");
      testResults.push({
        provider: res.provider,
        task: "Content",
        text: res.text,
        latencyMs: res.latencyMs,
        success: true,
      });
    } catch (err: any) {
      testResults.push({
        provider: "unknown",
        task: "Content",
        text: "",
        latencyMs: 0,
        success: false,
        error: err.message,
      });
    }

    // Test 5: Check Ollama availability
    try {
      const available = await ollamaIsAvailable();
      setOllamaStatus(available ? "Available" : "Not running");
    } catch {
      setOllamaStatus("Not available");
    }

    setResults(testResults);
    setLoading(false);
  };

  const usage = getAllUsage();

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", maxWidth: "900px" }}>
      <h1>🤖 AI Router Test</h1>
      <p>Verify all providers are working correctly.</p>

      <button
        onClick={runTests}
        disabled={loading}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          cursor: loading ? "wait" : "pointer",
          marginBottom: "2rem",
        }}
      >
        {loading ? "Running tests..." : "Run All Tests"}
      </button>

      <h2>Results</h2>
      {results.length === 0 && <p>No tests run yet.</p>}

      {results.map((r, i) => (
        <div
          key={i}
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            border: `2px solid ${r.success ? "#22c55e" : "#ef4444"}`,
            borderRadius: "8px",
            backgroundColor: r.success ? "#f0fdf4" : "#fef2f2",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{r.task}</strong>
            <span style={{ color: "#666" }}>{r.provider} | {r.latencyMs}ms</span>
          </div>
          {r.success ? (
            <p style={{ margin: "0.5rem 0 0" }}>{r.text}</p>
          ) : (
            <p style={{ margin: "0.5rem 0 0", color: "#ef4444" }}>Error: {r.error}</p>
          )}
        </div>
      ))}

      <h2>Usage Stats</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #333" }}>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Provider</th>
            <th style={{ textAlign: "right", padding: "0.5rem" }}>Requests</th>
            <th style={{ textAlign: "right", padding: "0.5rem" }}>Remaining</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(usage).map(([provider, stats]) => (
            <tr key={provider} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "0.5rem" }}>{provider}</td>
              <td style={{ textAlign: "right", padding: "0.5rem" }}>{stats.requests}</td>
              <td style={{ textAlign: "right", padding: "0.5rem" }}>{stats.remaining}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: "1rem", color: "#666" }}>
        Ollama: {ollamaStatus}
      </p>
    </div>
  );
}
