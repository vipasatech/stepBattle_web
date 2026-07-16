import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { PLANS } from "../lib/plans";
import styles from "./Upgrade.module.css";

/// Landing page the mobile app deep-links into. Expects the query
/// params:
///   * `uid`    — the user's Supabase user id (attached by the app)
///   * `plan`   — "pro" | "family"
///   * `period` — "monthly" | "yearly" (optional; overridable via
///                the toggle on the page itself)
///
/// Flow:
///   1. Validate params. Missing / bad → error state, no checkout.
///   2. Show a summary card of the chosen plan + a Monthly/Yearly
///      toggle. Price updates reactively.
///   3. On "Pay" tap → POST /api/create-order with (uid, plan,
///      selected period).
///   4. Server returns a Razorpay order id → open Razorpay Checkout.
///   5. Razorpay redirects the user to /upgrade/success or /failed
///      based on the outcome. The webhook (separate endpoint) does
///      the actual DB write; this page just triggers payment.
export default function Upgrade() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const uid = params.get("uid") ?? "";
  const planKey = params.get("plan") ?? "";

  // Initial period from URL (respects mobile-app pre-selection);
  // defaults to yearly since it's the better deal. Once on the
  // page, the toggle owns the state — the URL param is only used
  // as a first-render hint.
  const urlPeriod = params.get("period");
  const initialPeriod =
    urlPeriod === "monthly" ? "monthly" : "yearly";
  const [period, setPeriod] = useState(initialPeriod);

  const plan = PLANS[planKey];
  const price = useMemo(() => {
    if (!plan) return 0;
    return period === "yearly" ? plan.yearlyRupees : plan.monthlyRupees;
  }, [plan, period]);

  const [state, setState] = useState({ status: "idle", error: "" });

  // Preload the Razorpay Checkout script so the "Pay" button is
  // instant when the user taps it. Loaded once per session.
  useEffect(() => {
    if (window.Razorpay) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const invalidParams = !uid || !plan;

  async function startPayment() {
    if (invalidParams) return;
    setState({ status: "creating", error: "" });
    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, plan: planKey, period }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const { orderId, keyId, amount, currency, user } = await res.json();
      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout script failed to load.");
      }
      const rzp = new window.Razorpay({
        key: keyId,
        order_id: orderId,
        amount,
        currency,
        name: "StepBattle",
        // Logo shown on the left panel of the Razorpay modal.
        // Serving from the same origin so no CORS shenanigans.
        image: "https://www.stepbattle.fit/logo.png",
        description: `${plan.name} · ${
          period === "yearly" ? "Yearly plan" : "Monthly plan"
        }`,
        theme: { color: "#9333ea" },
        // Skips the "Enter phone / email" step in the modal if we
        // already know these from the mobile app's profile row.
        // Empty strings are fine — Razorpay just prompts as usual.
        prefill: {
          name: user?.name ?? "",
          email: user?.email ?? "",
          contact: user?.contact ?? "",
        },
        notes: { uid, plan: planKey, period },
        handler: () => {
          // Razorpay resolves the modal on payment. The webhook is
          // the authority on whether the payment actually settled;
          // this navigation is just optimistic UX.
          navigate(`/upgrade/success?plan=${planKey}&period=${period}`);
        },
        modal: {
          ondismiss: () => setState({ status: "idle", error: "" }),
        },
      });
      rzp.on("payment.failed", (resp) => {
        navigate(
          `/upgrade/failed?reason=${encodeURIComponent(
            resp?.error?.description ?? "Payment failed",
          )}`,
        );
      });
      setState({ status: "checkout", error: "" });
      rzp.open();
    } catch (e) {
      setState({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (invalidParams) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Something's off with this link</h1>
          <p className={styles.subtitle}>
            The plan or user info in the URL isn't valid. Please
            re-open the checkout from the StepBattle app.
          </p>
        </div>
      </main>
    );
  }

  // Precompute the yearly discount percentage so both the toggle
  // badge and the "save %" line agree without duplicating the math.
  const savingsPercent =
    plan.monthlyRupees > 0
      ? Math.round(
          100 - (plan.yearlyRupees / (plan.monthlyRupees * 12)) * 100,
        )
      : 0;

  return (
    <main className={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={styles.card}
      >
        <p className={styles.tag}>SECURE CHECKOUT</p>
        <h1 className={styles.title}>{plan.name}</h1>

        <BillingToggle
          period={period}
          onChange={setPeriod}
          yearlySavePercent={savingsPercent}
        />

        <div className={styles.priceRow}>
          <span className={styles.price}>₹{price}</span>
          <span className={styles.period}>
            / {period === "yearly" ? "year" : "month"}
          </span>
        </div>
        {period === "yearly" && plan.monthlyRupees && (
          <p className={styles.saving}>
            ~₹{Math.round(plan.yearlyRupees / 12)}/mo · save{" "}
            {savingsPercent}% vs monthly
          </p>
        )}

        <ul className={styles.features}>
          {plan.features.map((f) => (
            <li key={f}>
              <Check size={16} strokeWidth={3} />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <button
          className={styles.pay}
          onClick={startPayment}
          disabled={state.status === "creating" || state.status === "checkout"}
        >
          {state.status === "creating" || state.status === "checkout" ? (
            <>
              <Loader2 className={styles.spin} size={18} />
              <span>Opening secure checkout…</span>
            </>
          ) : (
            <span>Pay ₹{price} with Razorpay</span>
          )}
        </button>

        {state.status === "error" && (
          <p className={styles.error}>{state.error}</p>
        )}

        <div className={styles.trust}>
          <ShieldCheck size={14} />
          <span>
            Payment is processed by Razorpay. StepBattle never sees
            your card details.
          </span>
        </div>
      </motion.div>
    </main>
  );
}

/// Two-pill Monthly / Yearly switcher. Mirrors the mobile app's
/// UpgradeCTASheet toggle exactly so the two surfaces share a
/// language. Yearly pill carries a "Save N%" badge.
function BillingToggle({ period, onChange, yearlySavePercent }) {
  return (
    <div className={styles.toggle}>
      <button
        type="button"
        className={`${styles.togglePill} ${
          period === "monthly" ? styles.togglePillOn : ""
        }`}
        onClick={() => onChange("monthly")}
      >
        <span className={styles.togglePillLabel}>Monthly</span>
      </button>
      <button
        type="button"
        className={`${styles.togglePill} ${
          period === "yearly" ? styles.togglePillOn : ""
        }`}
        onClick={() => onChange("yearly")}
      >
        <span className={styles.togglePillLabel}>Yearly</span>
        {yearlySavePercent > 0 && (
          <span
            className={`${styles.toggleBadge} ${
              period === "yearly" ? styles.toggleBadgeOn : ""
            }`}
          >
            Save {yearlySavePercent}%
          </span>
        )}
      </button>
    </div>
  );
}
