import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listPosts = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { q } = await import("../db.server");
    const where: string[] = ["published = true"];
    const params: any[] = [];
    if (data.search) {
      params.push(`%${data.search}%`);
      where.push(`(title ILIKE $${params.length} OR excerpt ILIKE $${params.length})`);
    }
    if (data.category && data.category !== "all") {
      params.push(data.category);
      where.push(`category = $${params.length}`);
    }
    const offset = (data.page - 1) * data.pageSize;
    params.push(data.pageSize, offset);
    const lastIdx = params.length;
    return q(
      `SELECT id, title, slug, excerpt, category, featured_image, created_at
       FROM posts WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT $${lastIdx - 1} OFFSET $${lastIdx}`,
      params,
    );
  });

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { q1, q } = await import("../db.server");
    const post = await q1<any>(`SELECT * FROM posts WHERE slug = $1 AND published = true`, [
      data.slug,
    ]);
    if (!post) return { post: null, related: [] };
    const related = await q<any>(
      `SELECT id, title, slug, excerpt, category, featured_image, created_at
       FROM posts WHERE published = true AND category = $1 AND id <> $2
       ORDER BY created_at DESC LIMIT 3`,
      [post.category, post.id],
    );
    return { post, related };
  });

// ---------- Admin CRUD ----------

export const adminListPosts = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(500).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    const offset = (data.page - 1) * data.pageSize;
    return q(
      `SELECT id, title, slug, category, published, created_at, updated_at
       FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [data.pageSize, offset],
    );
  });

export const adminGetPost = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q1 } = await import("../db.server");
    return q1<any>(`SELECT * FROM posts WHERE id = $1`, [data.id]);
  });

const postSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/, "lowercase, numbers, hyphens only"),
  excerpt: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().min(1),
  category: z.string().trim().min(1).max(60),
  featured_image: z.string().trim().max(500).optional().or(z.literal("")),
  published: z.boolean().default(false),
});

export const savePost = createServerFn({ method: "POST" })
  .inputValidator((d) => postSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q1 } = await import("../db.server");
    if (data.id) {
      await q1(
        `UPDATE posts SET title=$1, slug=$2, excerpt=$3, content=$4, category=$5,
         featured_image=$6, published=$7 WHERE id=$8`,
        [data.title, data.slug, data.excerpt || null, data.content, data.category,
         data.featured_image || null, data.published, data.id],
      );
      return { ok: true, id: data.id };
    }
    const row = await q1<{ id: string }>(
      `INSERT INTO posts (title, slug, excerpt, content, category, featured_image, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [data.title, data.slug, data.excerpt || null, data.content, data.category,
       data.featured_image || null, data.published],
    );
    return { ok: true, id: row?.id };
  });

export const deletePost = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    await q(`DELETE FROM posts WHERE id = $1`, [data.id]);
    return { ok: true };
  });
