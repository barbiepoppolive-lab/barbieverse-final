import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { adminStatus, adminLogout } from "@/lib/api/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, LayoutDashboard, Users, ShoppingCart, Settings as SettingsIcon, FileText, LogOut, Home, Megaphone, AlertTriangle, Smartphone, UserPlus, ScrollText, IndianRupee, Radar, Globe, MessageCircle, BarChart3, Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/admin/login")) return;
    const status = await adminStatus();
    if (!status.isAdmin) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminLayout,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function AdminLayout() {
  const router = useRouter();
  const isLogin = router.state.location.pathname.startsWith("/admin/login");
  const logout = useServerFn(adminLogout);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (isLogin) return <Outlet />;

  const nav = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/admin/homepage", label: "Homepage", icon: Home },
    { to: "/admin/leads", label: "Leads", icon: Users },
    { to: "/admin/creator-leads", label: "Creator Leads", icon: UserPlus },
    { to: "/admin/scout", label: "Scout AI", icon: Radar },
    { to: "/admin/scraper", label: "Scraper", icon: Globe },
    { to: "/admin/costs", label: "Cost Monitor", icon: BarChart3 },
    { to: "/admin/social-leads", label: "Social Leads", icon: MessageCircle },
    { to: "/admin/payouts", label: "Payouts", icon: IndianRupee },
    { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { to: "/admin/unmatched", label: "Unmatched", icon: AlertTriangle },
    { to: "/admin/marketing", label: "Marketing", icon: Megaphone },
    { to: "/admin/posts", label: "Posts", icon: FileText },
    { to: "/admin/content", label: "Content AI", icon: Megaphone },
    { to: "/admin/upi-setup", label: "UPI Setup", icon: Smartphone },
    { to: "/admin/policies", label: "Policies", icon: ScrollText },
    { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-border/60 bg-card/40 backdrop-blur-md lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-5 py-5">
          <Sparkles className="h-5 w-5 text-primary animate-ambient-float" />
          <div className="font-display font-bold text-gradient-pink">Barbieverse</div>
          <div className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary lg:ml-0">Admin</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:pb-0">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-foreground hover:translate-x-1"
              activeProps={{ className: "bg-primary/15 text-foreground shadow-[0_0_15px_oklch(0.72_0.25_350/0.08)]" }}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
          <button
            onClick={async () => {
              await logout();
              router.navigate({ to: "/admin/login" });
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive lg:mt-4 lg:ml-0"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </nav>
      </aside>
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/admin" className="hover:text-foreground transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{nav.find(n => {
              const path = router.state.location.pathname;
              return n.exact ? path === n.to : path.startsWith(n.to);
            })?.label || "Overview"}</span>
          </div>
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-foreground hover:scale-110"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
              </span>
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="mb-3 text-sm font-semibold text-foreground">Notifications</p>
                <div className="space-y-2">
                  <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">System Online</p>
                    <p>All services running normally.</p>
                  </div>
                  <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Railway Deployed</p>
                    <p>Latest build deployed successfully.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
