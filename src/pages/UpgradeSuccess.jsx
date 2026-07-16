import { motion } from "framer-motion";
import { CheckCircle2, Smartphone } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { PLANS } from "../lib/plans";
import styles from "./UpgradeResult.module.css";

export default function UpgradeSuccess() {
  const [params] = useSearchParams();
  const plan = PLANS[params.get("plan") ?? "pro"];
  const period = params.get("period") ?? "monthly";
  const planName = plan?.name ?? "Subscription";
  return (
    <main className={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={styles.card}
      >
        <div className={`${styles.badge} ${styles.badgeSuccess}`}>
          <CheckCircle2 size={40} />
        </div>
        <h1 className={styles.title}>Welcome to {planName}!</h1>
        <p className={styles.subtitle}>
          Your {period === "yearly" ? "annual" : "monthly"} plan is
          active. You can head back to the StepBattle app — your new
          tier will show up in a moment.
        </p>
        <div className={styles.hint}>
          <Smartphone size={16} />
          <span>Open the StepBattle app to see it live.</span>
        </div>
      </motion.div>
    </main>
  );
}
