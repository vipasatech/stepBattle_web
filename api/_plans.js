// Duplicated from src/lib/plans.js because Vercel serverless
// functions can't import from the Vite src/ tree (different bundler
// contexts). Keep the two in sync — small enough that drift is
// cheap to detect.

export const PLANS = {
  pro: {
    tier: "pro",
    name: "Pro Pass",
    monthlyRupees: 149,
    yearlyRupees: 1499,
  },
  family: {
    tier: "family",
    name: "Family Pass",
    monthlyRupees: 299,
    yearlyRupees: 2999,
  },
};

export function priceInPaise(tier, period) {
  const plan = PLANS[tier];
  if (!plan) throw new Error(`Unknown tier: ${tier}`);
  const rupees =
    period === "yearly" ? plan.yearlyRupees : plan.monthlyRupees;
  return rupees * 100;
}

export function periodDurationMs(period) {
  return period === "yearly"
    ? 365 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
}
