import { Link } from "react-router-dom";
import styles from "./LegalPage.module.css";

/// Privacy Policy — placeholder content the app links to from
/// Settings → Support & About. Owner should replace with the
/// finalised policy (ideally reviewed by counsel). Route stays
/// the same, so no client-side change is needed when copy updates.
export default function Privacy() {
  return (
    <main className={styles.page}>
      <Link to="/" className={styles.back}>
        ← Back to home
      </Link>
      <article className={styles.article}>
        <h1>Privacy Policy</h1>
        <p className={styles.meta}>Last updated: 17 July 2026</p>

        <p>
          This Privacy Policy explains what data StepBattle collects,
          how we use it, and the choices you have. It applies to the
          StepBattle mobile app and the website{" "}
          <a href="https://www.stepbattle.fit">stepbattle.fit</a>.
        </p>

        <h2>1. What we collect</h2>
        <ul>
          <li>
            <strong>Account info</strong> — email address, display
            name, and (if you set them) a preferred name, date of
            birth, gender, fitness level, and phone number.
          </li>
          <li>
            <strong>Activity data</strong> — step counts, distance,
            calories, and workout sessions from the device's health
            sensors or from Health Connect / Apple Health, with your
            permission.
          </li>
          <li>
            <strong>Location</strong> — coarse city / district for
            local leaderboards; precise GPS only when you actively
            record a Track session.
          </li>
          <li>
            <strong>Payment</strong> — Razorpay handles card / UPI /
            netbanking data. StepBattle never sees your card details.
            We only receive a payment ID, tier, and amount.
          </li>
          <li>
            <strong>Device info</strong> — device model, OS version,
            and a Firebase push token so we can send battle and
            friend notifications.
          </li>
        </ul>

        <h2>2. How we use it</h2>
        <ul>
          <li>Run battles, missions, streaks, and leaderboards.</li>
          <li>Send push notifications you've opted into.</li>
          <li>Charge for Pro / Family subscriptions.</li>
          <li>
            Diagnose bugs and crashes (anonymised where possible).
          </li>
        </ul>

        <h2>3. Sharing</h2>
        <p>We share data only with:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — our database and auth
            provider (data is stored in AWS regions per Supabase's
            infrastructure).
          </li>
          <li>
            <strong>Razorpay</strong> — payment processing.
          </li>
          <li>
            <strong>Firebase Cloud Messaging</strong> — push
            notification delivery.
          </li>
          <li>Nobody else. We do not sell your data.</li>
        </ul>

        <h2>4. Your controls</h2>
        <ul>
          <li>
            Manage notification preferences in Settings →
            Notifications.
          </li>
          <li>
            Revoke Health Connect / Apple Health access from your
            phone's system settings at any time.
          </li>
          <li>
            Delete your account and all associated data from Settings
            → Delete account. Deletion cascades across all tables and
            removes the auth record. Payment history is retained for
            accounting.
          </li>
        </ul>

        <h2>5. Children</h2>
        <p>
          StepBattle is not directed at children under 13. If we learn
          we've collected data from a child under 13 we will delete
          it. Contact{" "}
          <a href="mailto:life@ultramind.app">life@ultramind.app</a>{" "}
          if you believe your child has created an account.
        </p>

        <h2>6. Changes to this Policy</h2>
        <p>
          Material changes will be communicated in-app before they
          take effect. The "Last updated" date at the top always
          reflects the current version.
        </p>

        <h2>7. Contact</h2>
        <p>
          Questions or requests:{" "}
          <a href="mailto:life@ultramind.app">life@ultramind.app</a>
        </p>
      </article>
    </main>
  );
}
