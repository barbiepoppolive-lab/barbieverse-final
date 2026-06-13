import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPosts } from "@/lib/api/posts.functions";
import { Search } from "lucide-react";
import { useState } from "react";

const postsQO = queryOptions({ queryKey: ["posts", "all"], queryFn: () => listPosts({ data: {} }) });

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Poppo Tips, Influencer Advice & Coin Deals | Barbieverse" },
      {
        name: "description",
        content:
          "Read the latest Poppo Live tips, influencer growth advice, and coin recharge offers from Barbieverse.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQO),
  component: BlogList,
  errorComponent: ({ error }) => <div className="p-8">Error: {error.message}</div>,
});

const categories = ["all", "Poppo Tips and Tricks", "Influencer Advice", "Coin Offers and Deals"];

function BlogList() {
  const { data: posts } = useSuspenseQuery(postsQO);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const filtered = posts.filter((p: any) => {
    if (category !== "all" && p.category !== category) return false;
    if (search && !(p.title.toLowerCase().includes(search.toLowerCase()) || (p.excerpt || "").toLowerCase().includes(search.toLowerCase())))
      return false;
    return true;
  });

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            The <span className="text-gradient-pink">Barbieverse</span> Blog
          </h1>
          <p className="mt-3 text-muted-foreground">
            Tips, deals & advice for Poppo Live creators
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="h-11 w-full rounded-lg border border-input bg-input/50 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 rounded-lg border border-input bg-input/50 px-3 text-sm focus:border-primary focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </select>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p: any) => (
            <Link
              key={p.id}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group flex flex-col rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md transition-all hover:border-primary/60"
            >
              {p.category && (
                <span className="inline-block w-fit rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                  {p.category}
                </span>
              )}
              <h3 className="mt-3 font-display text-lg font-bold transition-colors group-hover:text-primary">
                {p.title}
              </h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{p.excerpt}</p>
              <div className="mt-4 text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-10 text-center text-muted-foreground">No posts found.</div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
