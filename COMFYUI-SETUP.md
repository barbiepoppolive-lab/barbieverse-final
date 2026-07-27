# ComfyUI Setup for BarbieVerse Imagery

Written July 2026. Model recommendations move fast — treat the specific names
as a starting point and check Civitai for newer revisions before committing.

---

## 0. Fix this first, or none of the rest matters

`.env` currently has:

```
COMFYUI_BASE_URL=http://localhost:8188
```

On Railway, `localhost` is the Railway container. ComfyUI is on your PC. So
in production this **always fails and silently falls back to Pollinations
free flux** — which is why the images look subpar. The good path has never
run in production.

Two ways out, and they lead to different setups:

**A. Local batch generation (recommended).** Generation runs on your machine,
finished posts get pushed to Postiz as *scheduled* posts. Railway never needs
to reach ComfyUI at all. No tunnel, nothing to expire. Requires changing the
publishers from `"type": "now"` to a scheduled post — see the earlier
discussion in this project.

**B. Keep the tunnel.** Set `COMFYUI_BASE_URL` to your Cloudflare tunnel URL.
The comment in `.env` says it "regenerates on restart," which means this will
break every time your machine reboots. If you go this route, use a **named
tunnel** (`cloudflared tunnel create barbieverse-comfy`) so the hostname is
stable, rather than a quick tunnel with a random URL.

Option A is less fragile. Option B is less work today.

---

## 1. Checkpoint

Your images are portraits of Indian women in a streaming setup — photoreal,
faces front and centre. That is the single easiest category to get wrong.

**If you have 12GB+ VRAM: Flux.1 Dev.** It is the strongest open model for
photorealistic faces, hands and skin texture as of 2026, and it follows long
prompts far better than SDXL. Base Flux.1 Dev is good enough that you do not
need a fine-tune; add **XLabs RealismLora** at low weight for the last bit of
skin detail.

**If you have 8–12GB: an SDXL photoreal checkpoint.**
- **Juggernaut XL (Ragnarok)** — the most versatile photoreal SDXL checkpoint,
  heavily downloaded and actively maintained. Safe default.
- **RealVisXL V5.0** — better than Juggernaut specifically for tight portrait
  work, with a more natural film-like look. Given your content is almost all
  portraits, this is arguably the better pick for you.

**If you have under 8GB:** Flux.1 Schnell, or stay on Pollinations and put the
effort into prompts instead. Do not fight your hardware.

Check your VRAM before choosing — `nvidia-smi` on Windows.

---

## 2. Face consistency — the biggest quality lever you are missing

Right now every generated image is a different woman. For a brand built
around a recurring persona, that reads as stock imagery, and stock imagery is
exactly what makes recruitment content feel untrustworthy to the segment
that is already screening you for scams.

Pick one:

- **PuLID (Flux)** — current best for Flux workflows. One reference photo,
  consistent face across every generation, no training.
- **InstantID (SDXL)** — the SDXL equivalent. Mature, well-documented,
  works from a single reference image.
- **IPAdapter FaceID Plus** — functions as a one-image LoRA. More flexible
  for style transfer, slightly less exact on identity than InstantID.

Practical note from people doing this at volume: stacking IPAdapter +
InstantID + ControlNet often produces *worse* results than one good method on
a stronger base model. Start with a single technique and only add complexity
if you can see the specific problem it solves.

You will need one good reference photo of the persona. Generate a batch, pick
the best face, and use that as the reference from then on.

---

## 3. Settings

**Flux.1 Dev:** 20–28 steps, guidance 3.5, `euler` + `simple`. Flux wants
much lower guidance than SDXL — cranking CFG makes it worse, not sharper.

**SDXL:** 30–40 steps, CFG 4.5–7, `DPM++ 2M Karras`. Generate at native
1024×1024 (or 832×1216 portrait) — going below native resolution is the most
common cause of mushy SDXL output.

**FaceDetailer / ADetailer** — add this regardless of base model. It
re-renders the face region at full resolution. When a face occupies a small
part of the frame, this is the difference between usable and obviously AI.

**Upscale last:** `4x-UltraSharp` for a straightforward 2x pass. Avoid
aggressive face-restoration models like GFPGAN at high strength; they smooth
skin into plastic, which is precisely the "AI slop" look you are trying to
escape.

---

## 4. Prompting

Your current prompt in `image-persona.ts`:

```
professional portrait of a {persona} content creator, warm friendly smile,
modern streaming setup with pink and purple neon accent lighting in the
background, elegant casual outfit, soft studio lighting, high detail,
photorealistic, Instagram aesthetic
```

That is decent. Three changes:

1. **"content creator" → "streamer"** for consistency with the terminology
   rule — though note the model does not really render this either way, so
   it matters less here than in copy.
2. **Add imperfection.** "Natural skin texture, visible pores, slight
   asymmetry" fights the airbrushed look that makes images read as AI.
   Counterintuitive but it is the single highest-impact prompt change.
3. **Drop "Instagram aesthetic".** It pulls toward oversaturated filtered
   stock photography, which is generic by definition.

Negative prompt for SDXL (Flux largely ignores negatives):

```
plastic skin, airbrushed, waxy, oversaturated, cgi, 3d render, doll,
extra fingers, deformed hands, watermark, text, logo
```

**On the seed fix:** whoever refactored `cron-content.ts` was right that a
hardcoded seed produced near-duplicate images across the whole campaign.
Deriving the seed from the topic string is the correct fix — reproducible per
topic, varied across topics.

---

## 5. Order to do this in

1. Fix `COMFYUI_BASE_URL` (nothing else matters until this works in prod)
2. Confirm VRAM, install the matching checkpoint
3. Add FaceDetailer — biggest quality jump for least effort
4. Add PuLID or InstantID for a consistent persona
5. Tune prompts
6. Add upscaling last

Steps 1 and 3 will get you most of the visible improvement.

---

## Sources

- [Best Local AI Image Models 2026: FLUX vs SDXL vs Qwen — Local AI Master](https://localaimaster.com/blog/best-local-image-models-compared)
- [Best Photorealism Checkpoints for Local Image Generation (2026) — InsiderLLM](https://insiderllm.com/guides/best-photorealism-checkpoints-local-image-generation/)
- [Best Models for ComfyUI in 2026 — Serverman](https://www.serverman.co.uk/ai/comfyui/best-models-comfyui-2026/)
- [Create Consistent Characters in ComfyUI with IPAdapter FaceID Plus — RunComfy](https://www.runcomfy.com/comfyui-workflows/create-consistent-characters-in-comfyui-with-ipadapter-faceid-plus)
- [ComfyUI IPAdapter plus — GitHub (cubiq)](https://github.com/cubiq/comfyui_ipadapter_plus)
- [Enhanced ComfyUI Face Swapping: FaceDetailer + InstantID + IP-Adapter — MyAIForce](https://myaiforce.com/comfyui-instantid-ipadapter/)
