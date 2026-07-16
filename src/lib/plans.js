/// The subscription plan matrix — mirror of the mobile app's
/// `SubscriptionLimits` + `SubscriptionPricing`. Kept as a plain JS
/// object so the /upgrade page, the /api/create-order function, and
/// the /api/razorpay-webhook function can all read from one place.
///
/// Price is in RUPEES (whole INR). Convert to paise (× 100) when
/// creating a Razorpay order.
export const PLANS = {
  pro: {
    tier: "pro",
    name: "Pro Pass",
    monthlyRupees: 149,
    yearlyRupees: 1499,
    features: [
      "60 battle entries / month",
      "30 battles you can create",
      "Unlimited public joins",
      "60 private joins",
      "6 months battle history",
      "500 XP monthly streak bonus",
    ],
  },
  family: {
    tier: "family",
    name: "Family Pass",
    monthlyRupees: 299,
    yearlyRupees: 2999,
    features: [
      "60 battle entries / month · each",
      "30 battles you can create · each",
      "Unlimited public joins · each",
      "60 private joins · each",
      "6 months battle history",
      "1000 XP monthly streak bonus · each",
      "Share with up to 4 accounts",
    ],
  },
};

export function priceInPaise(tier, period) {
  const plan = PLANS[tier];
  if (!plan) throw new Error(`Unknown tier: ${tier}`);
  const rupees =
    period === "yearly" ? plan.yearlyRupees : plan.monthlyRupees;
  return rupees * 100;
}

/// Duration a paid subscription is valid for after purchase. Used to
/// compute `subscription_expires_at` when the webhook lands.
export function periodDurationMs(period) {
  return period === "yearly"
    ? 365 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
}
