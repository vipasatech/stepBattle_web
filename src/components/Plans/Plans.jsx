import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { FEATURE_ROWS, PRICING_TIERS } from "../../lib/pricingMatrix";
import styles from "./Plans.module.css";

/// Bottom-of-funnel plans section on the marketing Home page.
/// Reuses the same tier + feature matrix as /pricing so the two
/// surfaces stay in sync automatically; CTAs deep-link into the
/// mobile app via `stepbattle://upgrade?plan=X` because the actual
/// purchase always happens inside the authenticated app context.
export default function Plans() {
  const [period, setPeriod] = useState("yearly");

  return (
    <section id="plans" className={styles.section}>
      <div className={styles.top}>
        <p className={styles.eyebrow}>PLANS</p>
        <h2 className={styles.headline}>Pick your pace</h2>
        <p className={styles.sub}>
          Start free. Upgrade any time from inside the app —
          everything unlocks instantly.
        </p>

        <div className={styles.toggle}>
          <button
            className={`${styles.togglePill} ${
              period === "monthly" ? styles.togglePillOn : ""
            }`}
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            className={`${styles.togglePill} ${
              period === "yearly" ? styles.togglePillOn : ""
            }`}
            onClick={() => setPeriod("yearly")}
          >
            Yearly
            <span className={styles.saveBadge}>Save 16%</span>
          </button>
        </div>
      </div>

      <div className={styles.cards}>
        {PRICING_TIERS.map((tier) => (
          <article
            key={tier.key}
            className={`${styles.card} ${
              tier.highlight ? styles.cardFeatured : ""
            }`}
            style={{ "--tier-accent": tier.accent }}
          >
            {tier.highlight && (
              <div className={styles.badge}>
                <Sparkles size={12} strokeWidth={3} />
                Most popular
              </div>
            )}
            <p className={styles.tierName}>{tier.name}</p>
            <p className={styles.tierSub}>{tier.subtitle}</p>

            <div className={styles.priceRow}>
              {tier.priceRupees === 0 ? (
                <span className={styles.price}>Free</span>
              ) : (
                <>
                  <span className={styles.price}>
                    ₹
                    {period === "yearly"
                      ? Math.round(tier.yearlyRupees / 12)
                      : tier.priceRupees}
                  </span>
                  <span className={styles.per}>/ month</span>
                </>
              )}
            </div>
            {tier.priceRupees !== 0 && period === "yearly" && (
              <p className={styles.billed}>
                billed annually · ₹
                {tier.yearlyRupees.toLocaleString("en-IN")}
              </p>
            )}

            <a
              href={tier.cta.href}
              className={`${styles.cta} ${
                tier.cta.variant === "primary"
                  ? styles.ctaPrimary
                  : styles.ctaGhost
              }`}
            >
              {tier.cta.label}
            </a>

            <ul className={styles.featureList}>
              {tier.values.map((v, idx) => (
                <li key={FEATURE_ROWS[idx]} className={styles.featureRow}>
                  <Check
                    size={14}
                    strokeWidth={3}
                    className={styles.featureCheck}
                  />
                  <div className={styles.featureText}>
                    <span className={styles.featureLabel}>
                      {FEATURE_ROWS[idx]}
                    </span>
                    <span className={styles.featureValue}>{v}</span>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className={styles.fallback}>
        Don't have the app yet? Downloads coming soon — in the meantime,
        sign up on the mobile app to unlock upgrades.
      </p>
    </section>
  );
}
