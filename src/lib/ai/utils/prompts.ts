// Prompt Templates — Reusable prompts for BarbieVerse AI tasks

export const PROMPTS = {
  // Lead scoring
  leadScore: (leadData: string) => `Score this lead 1-100 based on quality:
    
Lead data: ${leadData}

Scoring criteria:
- Follower count (higher = better)
- Engagement rate (higher = better)
- Niche match with creator economy / live streaming
- Recent activity (posted within 7 days = good)
- Bio quality and completeness

Return JSON: { "score": number, "category": "hot"|"warm"|"cold", "reason": "brief explanation" }`,

  // Content generation
  instagramCaption: (topic: string, brandVoice?: string) =>
    `Write an Instagram caption for BarbieVerse about: ${topic}
    
${brandVoice ? `Brand voice: ${brandVoice}` : "Brand voice: empowering, fun, creator-focused"}
    
Requirements:
- Hook in first line
- 3-5 relevant hashtags
- Call to action
- Under 2000 characters`,

  // Lead analysis
  analyzeLead: (profileData: string) =>
    `Analyze this social media profile for lead quality:
    
${profileData}
    
Provide:
1. Estimated reach and influence
2. Niche/category
3. Content quality assessment
4. Partnership potential (1-10)
5. Recommended approach`,

  // Code review
  codeReview: (code: string) =>
    `Review this code for quality, security, and best practices:

\`\`\`
${code}
\`\`\`

Provide:
1. Issues found (critical, warning, info)
2. Security concerns
3. Performance suggestions
4. Code quality score (1-10)`,
} as const;
