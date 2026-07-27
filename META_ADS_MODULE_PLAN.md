# Meta Ads Runner — Research + Plan (not built yet)

Scope: a separate module from the ad-creative generator, responsible for actually creating, launching, monitoring, and iterating on paid Meta (Facebook/Instagram) campaigns to recruit creators. This document is research and a plan only — nothing below is implemented.

## 1. Correcting something I said last time

I told you getting Marketing API access would mean "the same bureaucracy as Postiz" (a public Meta App Review). That was wrong for this use case. Meta's own developer documentation and current guidance are clear: **App Review is only required when your app needs to manage ad accounts belonging to OTHER businesses.** For managing your own ad account (Barbieverse's own Business Manager, own ad account), Standard/Limited access — available immediately after creating a Meta app, adding the Marketing API product, and generating a System User token in Business Manager — is sufficient. No public review, no waiting on Meta's queue. That's a materially faster path than organic posting was, not a repeat of it.

The one access-tier nuance: Meta renamed "Standard/Advanced Access" to a "Marketing API Access Tier" system (Limited Access vs Full Access) as of May 2026. Limited Access has stricter rate limits; Full Access requires your app to have already made ~500 Marketing API calls in the past 15 days with under 15% errors. In practice: start on Limited Access, run real (paused, low-volume) API activity for a couple weeks, and you'll naturally qualify for Full Access without ever filing a review request. ([Update to Ads Management Standard Access](https://developers.meta.com/blog/updates-to-ads-management-standard-access-feature/), [Meta Advanced Access guide](https://singhamandeep.com/what-is-meta-advanced-access/))

## 2. Real prerequisites (before any code touches a live ad account)

1. **Meta Business Manager** — create/claim it, verify it (Business Settings → Security Center → Start Verification). Needs legal business name/address/phone plus one document (incorporation certificate, GST doc, or utility bill in the business's name). Meta states up to 14 days for verification; budget for that lead time. ([Meta verification requirements](https://www.facebook.com/business/help/810450577622394))
2. **Identity verification** — Meta may separately ask for a government ID from whoever is set as the account admin. For India that's Aadhaar, PAN, passport, or driver's license.
3. **Ad account + payment method** — Rupay/Visa/Mastercard debit or credit card. No India-specific blocker found beyond the general verification above, UNLESS this ever expands into ads explicitly about securities/investment returns (not the case here — recruiting creators isn't a securities ad — but noting it because Meta added SEBI-registration verification for India investment ads in mid-2025, so if positioning ever drifts toward "investment opportunity" language, that's a different and heavier compliance path).
4. **A Meta App + Marketing API product added**, System User created in Business Manager, long-lived System User token generated and scoped to just the ad account (not a personal user token that expires).

None of this requires me or any code — it's admin work only you can do (business documents, ID, payment method).

## 3. The compliance question that actually matters most: is this an "Employment" ad?

This is the load-bearing open question for the whole targeting strategy, and I don't think it has a clean yes/no answer — it needs either a real answer from Meta's ad review in practice, or a conservative default.

**What Meta's Special Ad Category (Employment) restricts, if it applies:** no age targeting narrower than 18-65+, no gender targeting, no ZIP/postal-code-radius targeting, no Lookalike Audiences, no excluding audiences, and lead forms can't collect age/gender/relationship-status/location fields. This is enforced both by self-declaration (you're supposed to flag it yourself) and, as of 2026, by Meta's own multimodal classifier that scans ad *images* for hiring/office imagery and ad *copy* for job-posting language — meaning you can't just quietly avoid the checkbox if the creative reads as a job ad. ([Special Ad Category rules](https://www.data-axle.com/resources/blog/meta-special-ad-categories-rules/), [2026 ad policy update — multimodal HEC detection](https://www.auditsocials.com/blog/meta-ad-policy-updates-2026-guide))

**What actually qualifies:** Meta's own definition is "job opportunities, internships, job boards, certification programs" — full-time/part-time positions, employment agency services. Recruiting independent creators into a gift/revenue-share arrangement is arguably closer to a "business opportunity" / "income-generating program" than conventional employment (no W2, no fixed hours, no employer-employee relationship) — but it's genuinely ambiguous, and I found nothing in Meta's public docs that directly addresses gig-economy or creator-recruitment as a distinct case.

**My recommendation, not a certainty:** don't bet the targeting strategy on "we'll just not check the Employment box." Meta's classifier reads the actual creative. If the ad literally says "we're hiring," shows office/hiring-style imagery, or reads like a job posting, expect it to get flagged regardless of what you selected. If instead the creative leans on "opportunity/program/join the community" framing rather than "job/hiring" framing, it's more likely to run as a normal ad with full targeting freedom (including gender) — but this is a real compliance judgment call, not something I can guarantee from documentation alone. Worth either testing cautiously (submit one ad, see what Meta's review actually returns) or getting a real answer from someone who does Meta ads compliance professionally before committing budget to a gender-targeted campaign.

## 4. A separate, probably bigger risk: the "guarantee" language itself

Independent of the employment classification question, Meta's money-making/business-opportunity ad policy is one of its most heavily scrutinized categories — it overlaps hard with scam-ad enforcement. Explicitly banned patterns include "guaranteed returns," "guaranteed money," and specific income promises without substantiation. Income testimonials are only allowed when clearly marked non-typical with real context. ([Meta ad claims policy](https://gripasmarketing.com/meta-ads-claims-personal-policy/), [Auditsocials 2026 ad standards](https://www.auditsocials.com/blog/meta-ad-misleading-claims-personal-attributes-prohibited-content-policy-2026))

The business's own core hook — **"First Week Guarantee," ₹1,150/₹575 for streaming 2 hrs/day for 7 days** — uses exactly the word Meta's classifiers are tuned to flag, even though the number is real and contractual, not a scam. This is a genuine practical risk to flag before spending any ad budget: ads built straight around "Guaranteed ₹1,150" language have a real chance of rejection or a shadow-throttled account regardless of truthfulness. Likely mitigation (not yet built): reword the paid-ad-facing copy to something like "start earning from day one — ₹1,150 for your first week, terms apply" or move the specific number to the landing page/DM flow instead of the ad headline, and reserve "guarantee" framing for organic content where it isn't subject to Meta's ad-review classifier.

## 5. Budget planning — India benchmarks (2026)

- CPM: Facebook ₹50–400, Instagram ₹45–350 (Reels placements run 25–40% cheaper than feed)
- CPC: Facebook ₹2–25, Instagram ₹6–55
- CPL (lead-gen campaigns generally): ₹150–2,000 depending on targeting/creative/offer strength — wide range, no live-streaming-recruitment-specific number found in public benchmarks
([2026 India Meta ad benchmarks](https://productgrowth.in/tools/marketing/meta-ads/), [Facebook ads cost India 2026](https://www.vgraple.com/blog/facebook-ads-cost-india-2026))

Suggested test-phase budget: small daily caps (₹500–1,000/day) per angle, run 3-5 days per angle before judging — CPL benchmarks this wide mean the only real signal is your own data, not the published range.

## 6. Proposed module design (once prerequisites above are actually done)

Extends `src/lib/ads/meta-marketing.ts` (already stubbed) rather than replacing it:

- **Campaign/budget guardrails**: every campaign/ad set created with `status: PAUSED` and a hard `daily_budget` cap — no code path that can set `ACTIVE` without an explicit human action. A separate "activate" function, called only from an authenticated admin action (not cron), is the sole way anything goes live or spends money.
- **Targeting builder**: takes the angle from the ad-creative generator and the Employment-classification decision (§3) as an explicit flag, and either builds a restricted targeting object (broad age range, no gender field) or a normal one — never silently assumes.
- **Insights/reporting loop**: pulls `/insights` (CTR, CPL, spend, results) per ad daily, reuses the same score-and-evolve pattern already built for organic keyword discovery (`keyword-intel.ts`'s promote/demote/retire logic) so winning angles get more budget and losing ones get flagged for pause — mirrors infrastructure that already exists rather than inventing a new scoring system.
- **Telegram alerting**: daily spend + performance digest, and an explicit alert (not silent) if any campaign is about to exceed its budget cap or if Meta rejects an ad for policy reasons — rejections should surface the actual reason text, not just "failed."
- **Kill switch**: one function that pauses every active campaign under the ad account immediately, callable manually, for the "something's wrong, stop spending now" case.

## 7. What I still can't do

Same limitation as everything else this session: no network access from my sandbox, so I can't create the Business Manager, verify it, add a payment method, or test a real API call myself. This plan is ready to hand to whoever does that admin setup; once the ad account + System User token exist, the actual build (extending the stub file, wiring guardrails/reporting) is a normal follow-up task.

## Open decisions I need from you before building anything

1. Employment classification (§3): declare it, don't declare it and test cautiously, or get a real compliance opinion first?
2. Guarantee wording (§4): comfortable reworking the ad-facing copy away from "guaranteed ₹X," or want to keep it and accept the rejection risk?
3. Who owns the "activate" button once campaigns are built paused — you personally, or someone else on the team?
