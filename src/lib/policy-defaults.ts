// Default content for all BarbieVerse legal & policy pages.
// Admins can override any of these via the Policy Manager (settings table).
// Stored as lightweight Markdown — rendered by <MarkdownContent />.

export type PolicyKey =
  | "policy_privacy"
  | "policy_terms"
  | "policy_creator_reward"
  | "policy_recharge";

export const POLICY_META: Record<
  PolicyKey,
  { slug: string; title: string; eyebrow: string; subtitle: string }
> = {
  policy_privacy: {
    slug: "/privacy-policy",
    title: "Privacy Policy",
    eyebrow: "Trust & Transparency",
    subtitle:
      "How BarbieVerse collects, uses and protects your information across our creator and recharge services.",
  },
  policy_terms: {
    slug: "/terms-and-conditions",
    title: "Terms & Conditions",
    eyebrow: "Platform Usage",
    subtitle:
      "The rules that keep BarbieVerse a safe, fair and luxury experience for creators and customers.",
  },
  policy_creator_reward: {
    slug: "/creator-reward-policy",
    title: "Creator Reward Policy",
    eyebrow: "Creator Rewards",
    subtitle:
      "Transparent guidelines for BarbieVerse creator onboarding rewards.",
  },
  policy_recharge: {
    slug: "/recharge-policy",
    title: "Recharge Policy",
    eyebrow: "Recharge Services",
    subtitle: "Guidelines for coin purchases and recharge services.",
  },
};

export const DEFAULT_POLICY_CONTENT: Record<PolicyKey, string> = {
  policy_privacy: `## Information We Collect

We collect the minimum information required to deliver our services with care.

- **Mobile Numbers** — used to verify identity and send important confirmations.
- **WhatsApp Numbers** — used for application updates, order receipts and creator support.
- **UPI IDs** — used to pay out approved creator rewards and process refunds where applicable.
- **Application Data** — your platform choice, application ID and any details you provide while joining.
- **Order Data** — package selected, payment method, transaction reference and delivery status.

## How Information Is Used

- Creator onboarding and platform referral routing
- Reward eligibility review and payout processing
- Recharge order management and delivery confirmation
- Customer support across WhatsApp and email
- Fraud prevention and abuse detection

## Data Protection

We follow industry-standard practices to protect your data, including limited access, encrypted storage of sensitive fields and review of any third-party integrations used to deliver our services.

## Information Sharing

We do not sell your personal information. We share data only with trusted service providers that help us operate (such as messaging, payments and analytics partners), and only to the extent required to deliver our services. We may also disclose information when required by law or to prevent fraud.

## Your Choices

You may request to update or remove your information by contacting our team. Some data may be retained for compliance, dispute resolution or fraud prevention purposes.

## Contact Information

For privacy questions, reach the BarbieVerse team using the contact details on our [Contact page](/contact).`,

  policy_terms: `## Acceptance Of Terms

By using BarbieVerse — including joining as a creator, applying for rewards, or placing a recharge order — you agree to these Terms & Conditions.

## User Responsibilities

- Provide accurate and truthful information at all times.
- Use only your own contact details, UPI ID and platform accounts.
- Respect the BarbieVerse community and the platforms we support.

## Platform Usage

BarbieVerse offers creator onboarding, agency support and recharge assistance for supported third-party platforms. Availability and pricing may change without notice.

## Prohibited Activities

- Submitting false, misleading or duplicate information
- Sharing payment screenshots that are edited, fake or do not belong to you
- Abusing reward campaigns through multiple accounts or fraudulent activity
- Attempting to disrupt, exploit or reverse-engineer our services
- Any activity that violates Indian law or the policies of the supported platforms

## Fraud Prevention

> **BarbieVerse reserves the right to review, suspend or reject applications, rewards or recharge requests where suspicious activity is detected.**

This includes — but is not limited to — duplicate submissions, payment fraud, chargeback abuse, identity misuse and coordinated reward abuse.

## Account Limitations

We may limit, pause or terminate access to any BarbieVerse service at our discretion to protect creators, customers and the platform.

## Policy Updates

These Terms may be updated from time to time. Continued use of BarbieVerse after an update constitutes acceptance of the revised Terms.

## Limitation Of Liability

To the maximum extent permitted by law, BarbieVerse is not liable for indirect, incidental or consequential losses arising from the use of our services or the third-party platforms we support.

## Contact Information

Questions about these Terms? Visit our [Contact page](/contact).`,

  policy_creator_reward: `## What Is The Creator Reward

When you join Poppo/Vone Live through BarbieVerse, you gain access to Poppo/Vone's **Solo Live Mission** — a guaranteed first-week earning program for new hosts. This is paid directly by Poppo/Vone Live, not by BarbieVerse.

## How The Poppo/Vone First Week Mission Works

- Stream **2 hours daily** for **7 consecutive days**
- Complete **face authentication** on your Poppo/Vone account
- Reach **Level 5** on your Poppo/Vone profile
- Poppo/Vone pays you **20,000 points ($2) daily** — totalling $14 (₹1,150) in week one

## Gender-Based Earnings

| Creator Type | Week 1 Earnings |
|-------------|----------------|
| Female Host | ₹1,150 |
| Male Host | ₹575 |

## Eligibility Requirements

- Registration must be completed through an **official BarbieVerse referral link**.
- Accurate information must be provided.
- Only **one reward** is available per creator.
- Duplicate applications are not eligible.
- Must reach Level 5 and complete face authentication.

## Reward Review Process

- Applications are **reviewed manually**.
- Reward approval timelines may vary.
- Submitting an application does **not guarantee** reward approval.

## Disqualification Conditions

The following may result in disqualification from reward campaigns:

- Duplicate accounts
- Multiple applications
- False information
- Fraudulent activity
- Abuse of reward campaigns
- Suspicious platform activity

## Creator Earnings Disclaimer

- Week 1 earnings are guaranteed through Poppo/Vone's Solo Live Mission if requirements are met.
- Ongoing earnings are **not guaranteed**.
- Results vary based on creator activity, audience engagement and platform-specific factors.
- **Past creator performance does not guarantee future earnings.**

## Platform Independence

BarbieVerse is an **independent creator support ecosystem**. Platform operations, account approvals, account restrictions and creator earnings remain under the control of Poppo/Vone Live.

## Policy Updates

Reward campaigns may be **modified, paused or discontinued at any time** without prior notice.`,

  policy_recharge: `## Recharge Services

BarbieVerse provides recharge assistance for supported platforms. Delivery times may vary depending on platform conditions, payment verification and operational load.

## Customer Responsibilities

Users must provide:

- **Correct platform** (e.g. Poppo/Vone Live)
- **Correct user ID** on the target platform
- **Correct payment information**

BarbieVerse is **not responsible** for delivery issues caused by incorrect information submitted by the user.

## Payment Verification

Recharge orders may require payment verification before delivery. We may request additional verification — such as a payment screenshot or alternate reference — when necessary.

## Order Statuses

Your order moves through these stages:

1. **Payment Submitted**
2. **Payment Verified**
3. **Processing**
4. **Completed**
5. **Rejected** (only if verification fails or the order cannot be fulfilled)

## Refund Policy

- **Completed deliveries are generally not eligible for refunds.**
- Refund requests may be reviewed in cases involving:
  - Duplicate payments
  - Undelivered orders
  - Operational errors on our side

## Fraud Prevention

BarbieVerse may reject orders involving:

- Fake payment screenshots
- Chargeback abuse
- Payment fraud
- Identity misuse
- Suspicious account activity

## USDT Disclaimer

Users are **responsible for sending cryptocurrency to the correct wallet address and supported network**. Transactions sent to the wrong address or wrong network **may not be recoverable**.

## Limitation Of Liability

BarbieVerse is **not liable** for:

- Platform outages
- Platform policy changes
- Incorrect user information
- Third-party payment issues
- External service disruptions`,
};

// Contact section content — also stored per-field in settings.
export type ContactKey =
  | "contact_general_label"
  | "contact_general_value"
  | "contact_creator_label"
  | "contact_creator_value"
  | "contact_recharge_label"
  | "contact_recharge_value"
  | "contact_business_label"
  | "contact_business_value"
  | "contact_response_time";

export const CONTACT_DEFAULTS: Record<ContactKey, string> = {
  contact_general_label: "General Support",
  contact_general_value: "hello@barbieverse.org",
  contact_creator_label: "Creator Support",
  contact_creator_value: "creators@barbieverse.org",
  contact_recharge_label: "Recharge Support",
  contact_recharge_value: "WhatsApp our recharge desk for fastest help.",
  contact_business_label: "Business Enquiries",
  contact_business_value: "business@barbieverse.org",
  contact_response_time:
    "We typically respond within 24 hours on weekdays. Recharge support is prioritised.",
};

export const POLICY_KEYS: PolicyKey[] = [
  "policy_privacy",
  "policy_terms",
  "policy_creator_reward",
  "policy_recharge",
];

export const CONTACT_KEYS: ContactKey[] = [
  "contact_general_label",
  "contact_general_value",
  "contact_creator_label",
  "contact_creator_value",
  "contact_recharge_label",
  "contact_recharge_value",
  "contact_business_label",
  "contact_business_value",
  "contact_response_time",
];
