import { Link } from "react-router-dom";
import styles from "./LegalPage.module.css";

/// Terms of Service — placeholder content the app links to from
/// Settings → Support & About. Owner should replace this with the
/// finalised legal copy (ideally reviewed by counsel) before public
/// launch. The route stays the same, so no client-side change is
/// needed when the copy updates.
export default function Terms() {
  return (
    <main className={styles.page}>
      <Link to="/" className={styles.back}>
        ← Back to home
      </Link>
      <article className={styles.article}>
        <h1>Terms of Service</h1>
        <p className={styles.meta}>Last updated: 17 July 2026</p>

        <p>
          These Terms govern your use of StepBattle (the "Service"),
          operated by Vipasa Tech. By creating an account or using the
          Service, you agree to these Terms.
        </p>

        <h2>1. Eligibility</h2>
        <p>
          You must be at least 13 years old (or the minimum age of
          digital consent in your country) to use StepBattle. If you
          are under 18, you confirm your parent or guardian has
          reviewed and agreed to these Terms on your behalf.
        </p>

        <h2>2. Account</h2>
        <p>
          You are responsible for the security of your account and for
          all activity that occurs under it. Notify us immediately at{" "}
          <a href="mailto:contact@stepbattle.fit">contact@stepbattle.fit</a> if
          you suspect unauthorised access.
        </p>

        <h2>3. Subscriptions and payments</h2>
        <p>
          Paid tiers (Pro, Family) are charged in advance through
          Razorpay. Prices are shown in Indian Rupees (INR).
          Subscriptions renew only when you initiate the next payment
          — StepBattle does not auto-charge cards on file. See our
          <a href="mailto:contact@stepbattle.fit"> Refund Policy</a> for
          refund eligibility.
        </p>

        <h2>4. Acceptable use</h2>
        <p>
          You agree not to (a) tamper with step counts, use bots, or
          manipulate battles; (b) harass, threaten, or impersonate
          other users; (c) attempt to reverse-engineer or exploit the
          Service; (d) use the Service in violation of applicable law.
        </p>

        <h2>5. Fitness disclaimer</h2>
        <p>
          StepBattle is a gamified activity tracker, not medical
          advice. Consult a doctor before starting a new fitness
          routine. We are not liable for injuries sustained while
          using the Service.
        </p>

        <h2>6. Termination</h2>
        <p>
          You can delete your account at any time from Settings →
          Delete account. We may suspend or terminate accounts that
          violate these Terms.
        </p>

        <h2>7. Changes to these Terms</h2>
        <p>
          We may update these Terms. Material changes will be
          communicated in-app before they take effect.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a href="mailto:contact@stepbattle.fit">contact@stepbattle.fit</a>
        </p>
      </article>
    </main>
  );
}
