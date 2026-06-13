import { createFileRoute, useRouter } from "@tanstack/react-router";
import { adminLogin } from "@/lib/api/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Lock } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
});

function LoginPage() {
  const login = useServerFn(adminLogin);
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setLoading(true);
          try {
            const res = await login({ data: { password: pw } });
            if ((res as any)?.ok) {
              router.navigate({ to: "/admin" });
            } else {
              setErr((res as any)?.error || "Login failed");
            }
          } finally {
            setLoading(false);
          }
        }}
        className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-md"
      >
        <div className="flex items-center gap-2 font-display text-xl font-bold">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-gradient-pink">Barbieverse</span> Admin
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to manage the site.</p>
        <div className="mt-6">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              className="h-11 w-full rounded-lg border border-input bg-input/50 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        {err && <div className="mt-3 text-sm text-destructive">{err}</div>}
        <button
          disabled={loading}
          className="mt-6 h-11 w-full rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground glow-pink disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
