/// The comparison matrix rendered by /pricing. Superset of
/// PLANS (which only knows about the paid tiers) — Basic is
/// included here because it needs a column, even though it
/// isn't sold via Razorpay.
///
/// The Feature list defines row order; each tier's `values`
/// array must line up 1-to-1 with FEATURE_ROWS.
export const FEATURE_ROWS = [
  "Monthly Battle Entries",
  "Create Battles",
  "Join Public Battles",
  "Join Private Battles",
  "Battle Replay & History",
  "Monthly Streak XP Bonus",
];

export const PRICING_TIERS = [
  {
    key: "basic",
    name: "Free",
    subtitle: "Get started with StepBattle",
    priceRupees: 0,
    accent: "#8b3dff",
    values: [
      "15",
      "5",
      "Yes (5)",
      "Yes (10)",
      "30 days",
      "200 XP",
    ],
    cta: {
      label: "Start Free",
      // No paywall — Basic is what every account starts on.
      // The button just points to the app landing.
      href: "https://play.google.com/store/apps/details?id=com.stepbattle.stepbattle&hl=en_IN",
      variant: "ghost",
    },
  },
  {
    key: "pro",
    name: "Pro",
    subtitle: "For serious solo walkers",
    priceRupees: 149,
    yearlyRupees: 1499,
    accent: "#3b82f6",
    highlight: true,
    values: [
      "60",
      "30",
      "Yes (unlimited)",
      "Yes (60)",
      "6 months",
      "500 XP",
    ],
    cta: {
      label: "Get Pro",
      href: "https://play.google.com/store/apps/details?id=com.stepbattle.stepbattle&hl=en_IN",
      variant: "primary",
    },
  },
  {
    key: "family",
    name: "Pro Plus",
    subtitle: "More room to compete",
    priceRupees: 299,
    yearlyRupees: 2999,
    accent: "#a855f7",
    values: [
      "60 · each",
      "30 · each",
      "Yes (unlimited)",
      "Yes (60)",
      "Unlimited",
      "1000 XP · each",
    ],
    cta: {
      label: "Get Pro Plus",
      href: "https://play.google.com/store/apps/details?id=com.stepbattle.stepbattle&hl=en_IN",
      variant: "primary",
    },
  },
];
