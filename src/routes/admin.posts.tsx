import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  adminListPosts,
  adminGetPost,
  savePost,
  deletePost,
} from "@/lib/api/posts.functions";
import { Plus, Edit, Trash2, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/posts")({
  component: PostsAdmin,
});

const CATEGORIES = ["Poppo/Vone Tips", "Influencer Advice", "Coin Offers", "News", "Tutorial"];

function PostsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(adminListPosts);
  const { data: posts = [] } = useQuery({ queryKey: ["admin-posts"], queryFn: () => list() });
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const del = useServerFn(deletePost);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Blog Posts</h1>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p: any) => (
              <tr key={p.id} className="border-t border-border/40">
                <td className="px-4 py-3 font-semibold">{p.title}</td>
                <td className="px-4 py-3 text-muted-foreground">/{p.slug}</td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">
                  {p.published ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                      <Eye className="h-3 w-3" /> Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      <EyeOff className="h-3 w-3" /> Draft
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing(p.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:border-primary"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${p.title}"?`)) return;
                        await del({ data: { id: p.id } });
                        toast.success("Post deleted");
                        qc.invalidateQueries({ queryKey: ["admin-posts"] });
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-destructive hover:border-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  No posts yet. Click <b>New Post</b> to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <PostEditor
          id={editing === "new" ? null : editing}
          onClose={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-posts"] });
          }}
        />
      )}
    </div>
  );
}

function PostEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const getOne = useServerFn(adminGetPost);
  const save = useServerFn(savePost);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: CATEGORIES[0],
    featured_image: "",
    published: false,
  });
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOne({ data: { id } })
      .then((p: any) => {
        if (p)
          setForm({
            title: p.title || "",
            slug: p.slug || "",
            excerpt: p.excerpt || "",
            content: p.content || "",
            category: p.category || CATEGORIES[0],
            featured_image: p.featured_image || "",
            published: !!p.published,
          });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save({ data: { ...form, id: id || undefined } as any });
      toast.success(id ? "Post updated" : "Post created");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{id ? "Edit Post" : "New Post"}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Title">
              <input
                required
                value={form.title}
                onChange={(e) => {
                  const t = e.target.value;
                  setForm((f) => ({ ...f, title: t, slug: f.slug || slugify(t) }));
                }}
                className="w-full rounded-lg border border-input bg-input/40 px-3 py-2"
              />
            </Field>
            <Field label="Slug (URL)">
              <input
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                className="w-full rounded-lg border border-input bg-input/40 px-3 py-2 font-mono text-sm"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-input/40 px-3 py-2"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Featured image URL (optional)">
                <input
                  value={form.featured_image}
                  onChange={(e) => setForm((f) => ({ ...f, featured_image: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-input/40 px-3 py-2"
                  placeholder="https://..."
                />
              </Field>
            </div>
            <Field label="Excerpt (short summary)">
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-input bg-input/40 px-3 py-2"
                maxLength={500}
              />
            </Field>
            <Field label="Content (HTML supported)">
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={14}
                className="w-full rounded-lg border border-input bg-input/40 px-3 py-2 font-mono text-sm"
                placeholder={`<h2>Heading</h2>\n<p>Paragraph...</p>\n<ul><li>Tip 1</li></ul>`}
              />
            </Field>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm">Published (visible on /blog)</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border border-border px-4 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="h-10 rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Post"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
