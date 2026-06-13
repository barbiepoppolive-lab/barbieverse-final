// src/lib/api/ugc-validation.functions.ts
// AI-powered screenshot validation using Claude Vision API

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Validate UGC screenshot using Claude Vision API
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
        return {
          valid: false,
          reason: "Could not fetch image",
          check_instagram: false,
          check_app: false,
          check_tag: false,
          check_genuine: false,
        };
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      const mediaType = imageResponse.headers.get("content-type") || "image/jpeg";

      // Get API key from environment
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY not configured");
      }

      // Call Claude Vision API
      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64Image,
                  },
                },
                {
                  type: "text",
                  text: `Analyze this screenshot and check ALL of these conditions:

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
}`,
                },
              ],
            },
          ],
        }),
      });

      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        console.error("[Claude API error]", claudeResponse.status, errorText);
        return {
          valid: false,
          reason: "Validation service error",
          check_instagram: false,
          check_app: false,
          check_tag: false,
          check_genuine: false,
        };
      }

      const responseData: any = await claudeResponse.json();
      const content = responseData.content?.[0]?.text || "";

      // Parse JSON response
      let parsed;
      try {
        // Extract JSON from response (Claude might add text before/after)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("[JSON parse error]", e, "Response:", content);
        return {
          valid: false,
          reason: "Could not validate image",
          check_instagram: false,
          check_app: false,
          check_tag: false,
          check_genuine: false,
        };
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
        reason: !isValid ? parsed.reason || "One or more checks failed" : undefined,
        check_instagram: parsed.check_instagram || false,
        check_app: parsed.check_app || false,
        check_tag: parsed.check_tag || false,
        check_genuine: parsed.check_genuine || false,
      };
    } catch (err: any) {
      console.error("[Screenshot validation error]", err);
      return {
        valid: false,
        reason: err.message || "Validation error",
        check_instagram: false,
        check_app: false,
        check_tag: false,
        check_genuine: false,
      };
    }
  });
