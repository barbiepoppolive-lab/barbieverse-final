import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPost } from "@/lib/api/posts.functions";
import { HowToEarnBlogPost } from "./blog.how-to-earn-money-on-poppo-live-india";

const HARDCODED_SLUGS: Record<string, React.ComponentType> = {
  "how-to-earn-money-on-poppo-live-india": HowToEarnBlogPost,
};

const postQO = (slug: string) =>
  queryOptions({ queryKey: ["post", slug], queryFn: () => getPost({ data: { slug } }) });

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ context, params }) => {
    if (HARDCODED_SLUGS[params.slug]) return;
    return context.queryClient.ensureQueryData(postQO(params.slug));
  },
  head: ({ params }) => {
    if (HARDCODED_SLUGS[params.slug]) {
      return {
        meta: [
          { title: "How to Earn Money on Poppo/Vone Live in India (2026 Beginner Guide) | Barbieverse" },
          { name: "description", content: "Complete beginner guide to earning money on Poppo/Vone Live in India." },
        ],
      };
    }
    return { meta: [{ title: "Blog | Barbieverse" }] };
  },
  component: PostRouter,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Post not found</h1>
        <Link to="/blog" className="mt-4 inline-block text-primary">← Back to blog</Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => <div className="p-8">Error: {error.message}</div>,
});

function PostRouter() {
  const { slug } = Route.useParams();
  const Hardcoded = HARDCODED_SLUGS[slug];
  if (Hardcoded) return <Hardcoded />;
  return <DbPostPage slug={slug} />;
}

function DbPostPage({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(postQO(slug));
  const post = (data as any)?.post;
  const related = (data as any)?.related ?? [];
  if (!post) {
    return (
      <SiteLayout>
        <div className="container mx-auto py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Post not found</h1>
          <Link to="/blog" className="mt-4 inline-block text-primary">← Back to blog</Link>
        </div>
      </SiteLayout>
    );
  }
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-12 lg:py-16">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary">← All posts</Link>
        {post.category && (
          <span className="mt-6 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
            {post.category}
          </span>
        )}
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">{post.title}</h1>
        <div className="mt-3 text-sm text-muted-foreground">
          {new Date(post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        {post.featured_image && (
          <img src={post.featured_image} alt="" className="mt-6 w-full rounded-2xl" />
        )}
        <div className="prose prose-invert prose-pink mt-8 max-w-none whitespace-pre-wrap text-foreground/90">
          {post.content}
        </div>
      </article>
      {related.length > 0 && (
        <section className="container mx-auto max-w-5xl px-4 pb-20">
          <h2 className="font-display text-2xl font-bold">Related posts</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map((r: any) => (
              <Link
                key={r.id}
                to="/blog/$slug"
                params={{ slug: r.slug }}
                className="rounded-2xl border border-border/60 bg-card/60 p-5 transition-colors hover:border-primary/60"
              >
                <h3 className="font-display font-semibold">{r.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
