import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { FEATURE_ROWS, PRICING_TIERS } from "../lib/pricingMatrix";
// FEATURE_ROWS drives the per-card feature labels; the standalone
// comparison table below the cards was removed as redundant.
import styles from "./Pricing.module.css";

/// Public pricing page — no auth, no uid. Marketing surface.
///
/// The CTAs deep-link into the mobile app via `stepbattle://` so
/// the actual purchase happens inside the authenticated app
/// context (which knows the user's uid). If the app isn't
/// installed, the browser silently keeps the current URL and
/// the fallback text below the button suggests downloading.
export default function Pricing() {
  const [period, setPeriod] = useState("monthly");

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <Link to="/" className={styles.homeLink}>
          ← Back to home
        </Link>
        <h1 className={styles.title}>Pick your pace</h1>
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
      </header>

      <section className={styles.cards}>
        {PRICING_TIERS.map((tier, i) => (
          <motion.article
            key={tier.key}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
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
          </motion.article>
        ))}
      </section>

      <p className={styles.fallback}>
        Don't have the app yet? Downloads coming soon — in the meantime,
        sign up on the mobile app to unlock upgrades.
      </p>
    </main>
  );
}
