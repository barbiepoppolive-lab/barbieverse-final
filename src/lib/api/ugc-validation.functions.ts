// src/lib/api/ugc-validation.functions.ts
// AI-powered screenshot validation using AI Router (Claude Vision primary, Gemini fallback)

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { aiRoute } from "@/lib/ai";

const UGC_PROMPT = `Analyze this screenshot and check ALL of these conditions:

1. Is this an Instagram story or post screenshot? (Look for Instagram UI elements like username, timestamp, story gradient border)
2. Does it show Poppo Live or Vone Live app? (Look for app name, logo, app interface, or store badges)
3. Is @barbieverse tagged or mentioned? (Look for @barbieverse mention anywhere)
4. Does this appear to be a genuine unedited screenshot? (Not heavily manipulated, real UI elements)

Return ONLY this exact JSON with no other text:
{
  "valid": true/false,
  "check_instagram": true/false,
  "check_app": true/false,
  "check_tag": true/false,
  "check_genuine": true/false,
  "reason": "brief reason if valid=false"
}`;

const DEFAULT_RESPONSE = {
  valid: false,
  reason: "Could not validate image",
  check_instagram: false,
  check_app: false,
  check_tag: false,
  check_genuine: false,
};

/**
 * Validate UGC screenshot using AI Router
 * Primary: Claude Vision | Fallback: Gemini Vision
 * Checks for:
 * 1. Is this an Instagram screenshot?
 * 2. Is Poppo/Vone app visible?
 * 3. Is @barbieverse tagged?
 * 4. Is it a genuine unedited screenshot?
 */
export const validateUgcScreenshot = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        screenshot_url: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      // Fetch the image from URL
      const imageResponse = await fetch(data.screenshot_url);
      if (!imageResponse.ok) {
        return { ...DEFAULT_RESPONSE, reason: "Could not fetch image" };
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      const mediaType =
        imageResponse.headers.get("content-type") || "image/jpeg";

      // Use AI Router (tries Claude Vision first, falls back to Gemini)
      const result = await aiRoute({
        prompt: UGC_PROMPT,
        taskType: "vision",
        imageBase64: base64Image,
        mimeType: mediaType,
      });

      // Parse JSON response
      let parsed;
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("[JSON parse error]", e, "Response:", result.text);
        return DEFAULT_RESPONSE;
      }

      // All checks must pass for valid submission
      const isValid =
        parsed.valid &&
        parsed.check_instagram &&
        parsed.check_app &&
        parsed.check_tag &&
        parsed.check_genuine;

      return {
        valid: isValid,
        reason: !isValid
          ? parsed.reason || "One or more checks failed"
          : undefined,
        check_instagram: parsed.check_instagram || false,
        check_app: parsed.check_app || false,
        check_tag: parsed.check_tag || false,
        check_genuine: parsed.check_genuine || false,
        _meta: {
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
        },
      };
    } catch (err: any) {
      console.error("[Screenshot validation error]", err);
      return { ...DEFAULT_RESPONSE, reason: err.message || "Validation error" };
    }
  });
