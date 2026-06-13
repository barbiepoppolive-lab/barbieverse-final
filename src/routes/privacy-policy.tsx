import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/api/settings.functions";
import { PolicyShell } from "@/components/PolicyShell";
import { DEFAULT_POLICY_CONTENT, POLICY_META } from "@/lib/policy-defaults";

const qo = queryOptions({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });
const meta = POLICY_META.policy_privacy;

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: `${meta.title} — BarbieVerse` },
      { name: "description", content: meta.subtitle },
      { property: "og:title", content: `${meta.title} — BarbieVerse` },
      { property: "og:description", content: meta.subtitle },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: Page,
  errorComponent: ({ error }) => <div className="p-8">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Page() {
  const { data } = useSuspenseQuery(qo);
  const content = data.policy_privacy || DEFAULT_POLICY_CONTENT.policy_privacy;
  return (
    <PolicyShell
      eyebrow={meta.eyebrow}
      title={meta.title}
      subtitle={meta.subtitle}
      content={content}
      lastUpdated={data.policy_privacy_updated || "Today"}
    />
  );
}
