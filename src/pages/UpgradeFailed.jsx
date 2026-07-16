import { motion } from "framer-motion";
import { RefreshCcw, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import styles from "./UpgradeResult.module.css";

export default function UpgradeFailed() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reason = params.get("reason") ?? "Payment couldn't be completed.";
  return (
    <main className={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={styles.card}
      >
        <div className={`${styles.badge} ${styles.badgeError}`}>
          <XCircle size={40} />
        </div>
        <h1 className={styles.title}>Payment didn't go through</h1>
        <p className={styles.subtitle}>{reason}</p>
        <p className={styles.hint} style={{ marginTop: 12 }}>
          You haven't been charged. Try again, or go back to the app
          and pick a different plan.
        </p>
        <button
          className={styles.retry}
          onClick={() => navigate(-1)}
        >
          <RefreshCcw size={16} />
          <span>Try again</span>
        </button>
      </motion.div>
    </main>
  );
}
