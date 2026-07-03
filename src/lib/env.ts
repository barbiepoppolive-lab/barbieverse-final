// Safe env accessor — uses bracket notation to avoid Railpack static analysis
// Railpack scans for process.env.XXX and treats them as Docker build secrets
// This function hides the key from static analysis

export function env(key: string, fallback?: string): string | undefined {
  try {
    const val = (globalThis as any).process?.env?.[key];
    return val !== undefined && val !== "" ? val : fallback;
  } catch {
    return fallback;
  }
}
