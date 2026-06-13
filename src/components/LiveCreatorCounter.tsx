import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { liveCreatorStats } from "@/lib/api/payouts.functions";
import { Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function LiveCreatorCounter() {
  const fn = useServerFn(liveCreatorStats);
  const { data } = useQuery({
    queryKey: ["live-creator-stats"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const { t } = useLang();
  const today = data?.today ?? 0;
  const total = data?.total ?? 0;
  if (total === 0) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 backdrop-blur-md">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <Sparkles className="h-3 w-3" />
      <span>
        <span className="text-emerald-300">+{today}</span> {t("counter.label")}
      </span>
    </div>
  );
}
