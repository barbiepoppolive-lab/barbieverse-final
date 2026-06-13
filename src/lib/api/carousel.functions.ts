import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type CarouselSlide = {
  id: string;
  carousel_type: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  sort_order: number;
  is_active: boolean;
  scheduled_at: string | null;
};

export const getCarouselSlides = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ type: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { q } = await import("../db.server");
    const rows = await q<CarouselSlide>(
      `SELECT id, carousel_type, title, subtitle, description, image_url, button_text, button_link, sort_order, is_active, scheduled_at
       FROM carousel_slides
       WHERE carousel_type = $1
         AND is_active = true
         AND (scheduled_at IS NULL OR scheduled_at <= now())
       ORDER BY sort_order ASC, created_at ASC`,
      [data.type],
    );
    return rows;
  });

export const listAllSlides = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("../admin-session.server");
  await requireAdmin();
  const { q } = await import("../db.server");
  return q<CarouselSlide>(
    `SELECT id, carousel_type, title, subtitle, description, image_url, button_text, button_link, sort_order, is_active, scheduled_at
     FROM carousel_slides ORDER BY carousel_type, sort_order ASC, created_at ASC`,
  );
});

const slideSchema = z.object({
  id: z.string().uuid().optional(),
  carousel_type: z.string().min(1).max(64),
  title: z.string().max(200).nullable().optional(),
  subtitle: z.string().max(300).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
  button_text: z.string().max(100).nullable().optional(),
  button_link: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
  scheduled_at: z.string().nullable().optional(),
});

export const upsertSlide = createServerFn({ method: "POST" })
  .inputValidator((d) => slideSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q, q1 } = await import("../db.server");
    if (data.id) {
      await q(
        `UPDATE carousel_slides SET
          carousel_type=$2, title=$3, subtitle=$4, description=$5, image_url=$6,
          button_text=$7, button_link=$8, sort_order=COALESCE($9, sort_order),
          is_active=COALESCE($10, is_active), scheduled_at=$11
         WHERE id=$1`,
        [data.id, data.carousel_type, data.title ?? null, data.subtitle ?? null, data.description ?? null, data.image_url ?? null,
          data.button_text ?? null, data.button_link ?? null, data.sort_order ?? null, data.is_active ?? null, data.scheduled_at ?? null],
      );
      return { id: data.id };
    }
    const maxRow = await q1<{ m: number }>(
      `SELECT COALESCE(MAX(sort_order),0) AS m FROM carousel_slides WHERE carousel_type=$1`,
      [data.carousel_type],
    );
    const nextOrder = (maxRow?.m ?? 0) + 1;
    const row = await q1<{ id: string }>(
      `INSERT INTO carousel_slides (carousel_type, title, subtitle, description, image_url, button_text, button_link, sort_order, is_active, scheduled_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [data.carousel_type, data.title ?? null, data.subtitle ?? null, data.description ?? null, data.image_url ?? null,
        data.button_text ?? null, data.button_link ?? null, data.sort_order ?? nextOrder, data.is_active ?? true, data.scheduled_at ?? null],
    );
    return { id: row!.id };
  });

export const deleteSlide = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    await q(`DELETE FROM carousel_slides WHERE id=$1`, [data.id]);
    return { ok: true };
  });

export const reorderSlide = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), direction: z.enum(["up", "down"]) }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q, q1 } = await import("../db.server");
    const cur = await q1<{ id: string; carousel_type: string; sort_order: number }>(
      `SELECT id, carousel_type, sort_order FROM carousel_slides WHERE id=$1`,
      [data.id],
    );
    if (!cur) return { ok: false };
    const neighbor = await q1<{ id: string; sort_order: number }>(
      data.direction === "up"
        ? `SELECT id, sort_order FROM carousel_slides WHERE carousel_type=$1 AND sort_order < $2 ORDER BY sort_order DESC LIMIT 1`
        : `SELECT id, sort_order FROM carousel_slides WHERE carousel_type=$1 AND sort_order > $2 ORDER BY sort_order ASC LIMIT 1`,
      [cur.carousel_type, cur.sort_order],
    );
    if (!neighbor) return { ok: false };
    await q(`UPDATE carousel_slides SET sort_order=$1 WHERE id=$2`, [neighbor.sort_order, cur.id]);
    await q(`UPDATE carousel_slides SET sort_order=$1 WHERE id=$2`, [cur.sort_order, neighbor.id]);
    return { ok: true };
  });
